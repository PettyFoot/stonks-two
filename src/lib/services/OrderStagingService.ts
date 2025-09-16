import { prisma } from '@/lib/prisma';
import { InputValidator } from '@/lib/security/InputValidator';
import { StagingMonitor } from '@/lib/monitoring/StagingMonitor';
import type { BrokerCsvFormat, ImportBatch, MigrationStatus } from '@prisma/client';

export interface StagingResult {
  success: boolean;
  stagedCount: number;
  errorCount: number;
  errors: string[];
  importBatchId: string;
  requiresApproval: boolean;
}

export interface StagingRecord {
  userId: string;
  importBatchId: string;
  brokerCsvFormatId: string;
  rawCsvRow: any;
  rowIndex: number;
  initialMappedData?: any;
  migrationStatus: MigrationStatus;
}

/**
 * Service for managing order staging operations
 * Handles batch processing, validation, and staging of CSV orders
 */
export class OrderStagingService {
  private static readonly BATCH_SIZE = 100;
  private static readonly MAX_STAGING_RECORDS = 50000; // Per user limit

  /**
   * Stage orders from CSV records for admin approval
   */
  async stageOrders(
    records: any[],
    format: BrokerCsvFormat,
    importBatch: ImportBatch,
    userId: string
  ): Promise<StagingResult> {
    const errors: string[] = [];
    let stagedCount = 0;
    let errorCount = 0;

    try {
      // Check if user has exceeded staging limits
      await this.checkStagingLimits(userId);

      // Validate format is not approved (shouldn't stage approved formats)
      if (format.isApproved) {
        throw new Error('Cannot stage orders for approved format');
      }

      console.log(`[OrderStagingService] Staging ${records.length} orders for format ${format.id}`);

      const stagingRecords: StagingRecord[] = [];

      // Process and validate each record
      for (let i = 0; i < records.length; i++) {
        try {
          // Validate CSV row structure
          InputValidator.validateCsvRow(records[i]);

          // Sanitize the raw data
          const sanitizedRow = InputValidator.sanitizeJsonData(records[i]);

          // Create initial mapping for reference
          const initialMappedData = this.applyInitialMappings(
            sanitizedRow,
            format.fieldMappings
          );

          stagingRecords.push({
            userId,
            importBatchId: importBatch.id,
            brokerCsvFormatId: format.id,
            rawCsvRow: sanitizedRow,
            rowIndex: i,
            initialMappedData,
            migrationStatus: 'PENDING'
          });

          // Process in batches to avoid memory issues
          if (stagingRecords.length >= OrderStagingService.BATCH_SIZE) {
            await this.insertStagingBatch(stagingRecords);
            stagedCount += stagingRecords.length;
            stagingRecords.length = 0; // Clear array
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${i + 1}: ${errorMessage}`);

          // Continue processing other rows even if some fail
          // Only stop if we have at least 5 errors AND more than 50% failure rate
          if (errorCount >= 5 && errorCount > records.length * 0.5) {
            // If more than 50% of rows fail, stop processing
            throw new Error('Too many validation errors. Stopping processing.');
          }
        }
      }

      // Insert remaining records
      if (stagingRecords.length > 0) {
        await this.insertStagingBatch(stagingRecords);
        stagedCount += stagingRecords.length;
      }

      // Update import batch with staging info
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'PENDING',
          successCount: stagedCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined,
          userReviewRequired: true
        }
      });

      console.log(`[OrderStagingService] Successfully staged ${stagedCount} orders, ${errorCount} errors`);

      // Record monitoring metrics
      const duration = Date.now() - Date.parse(importBatch.createdAt.toISOString());
      await StagingMonitor.trackStaging(
        format.id,
        stagedCount > 0,
        duration,
        stagedCount + errorCount,
        errorCount
      );

      return {
        success: stagedCount > 0,
        stagedCount,
        errorCount,
        errors,
        importBatchId: importBatch.id,
        requiresApproval: true
      };

    } catch (error) {
      console.error('[OrderStagingService] Staging failed:', error);

      // Update import batch with failure
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED',
          errorCount: records.length,
          errors: [error instanceof Error ? error.message : 'Staging failed']
        }
      });

      throw error;
    }
  }

  /**
   * Insert a batch of staging records
   */
  private async insertStagingBatch(records: StagingRecord[]): Promise<void> {
    try {
      await prisma.orderStaging.createMany({
        data: records,
        skipDuplicates: true
      });
    } catch (error) {
      console.error('[OrderStagingService] Batch insert failed:', error);
      throw new Error(`Failed to insert staging batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has exceeded staging limits
   */
  private async checkStagingLimits(userId: string): Promise<void> {
    const pendingCount = await prisma.orderStaging.count({
      where: {
        userId,
        migrationStatus: 'PENDING'
      }
    });

    if (pendingCount >= OrderStagingService.MAX_STAGING_RECORDS) {
      throw new Error(
        `Staging limit exceeded. You have ${pendingCount} pending orders. ` +
        `Maximum allowed: ${OrderStagingService.MAX_STAGING_RECORDS}`
      );
    }
  }

  /**
   * Apply initial mappings to raw CSV row for preview purposes
   */
  private applyInitialMappings(rawRow: any, fieldMappings: any): any {
    const mapped: any = {};

    try {
      for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
        const value = rawRow[csvColumn];

        if (value !== undefined && value !== null && value !== '') {
          // Handle different mapping formats
          if (typeof mapping === 'object' && mapping !== null) {
            if ('field' in mapping) {
              mapped[mapping.field as string] = value;
            } else if ('fields' in mapping && Array.isArray(mapping.fields)) {
              // Map to multiple fields
              mapping.fields.forEach((field: string) => {
                mapped[field] = value;
              });
            }
          } else if (typeof mapping === 'string') {
            mapped[mapping] = value;
          }
        }
      }

      return mapped;
    } catch (error) {
      console.warn('[OrderStagingService] Failed to apply initial mappings:', error);
      return rawRow; // Fallback to original data
    }
  }

  /**
   * Get staging status for a user
   */
  async getStagingStatus(userId: string): Promise<{
    pendingCount: number;
    totalStaged: number;
    formatsPendingApproval: number;
  }> {
    const [pendingCount, totalStaged, formatsPendingApproval] = await Promise.all([
      prisma.orderStaging.count({
        where: {
          userId,
          migrationStatus: 'PENDING'
        }
      }),
      prisma.orderStaging.count({
        where: { userId }
      }),
      prisma.orderStaging.groupBy({
        by: ['brokerCsvFormatId'],
        where: {
          userId,
          migrationStatus: 'PENDING'
        }
      }).then(groups => groups.length)
    ]);

    return {
      pendingCount,
      totalStaged,
      formatsPendingApproval
    };
  }

  /**
   * Get staged orders for a user
   */
  async getStagedOrders(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      migrationStatus?: MigrationStatus;
      brokerCsvFormatId?: string;
    } = {}
  ) {
    const {
      limit = 50,
      offset = 0,
      migrationStatus,
      brokerCsvFormatId
    } = options;

    const where: any = { userId };

    if (migrationStatus) {
      where.migrationStatus = migrationStatus;
    }

    if (brokerCsvFormatId) {
      where.brokerCsvFormatId = brokerCsvFormatId;
    }

    const [orders, total] = await Promise.all([
      prisma.orderStaging.findMany({
        where,
        include: {
          brokerCsvFormat: {
            select: {
              formatName: true,
              broker: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.orderStaging.count({ where })
    ]);

    return {
      orders,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Clean up expired staging records
   */
  async cleanupExpiredRecords(): Promise<number> {
    const deleted = await prisma.orderStaging.deleteMany({
      where: {
        retentionDate: {
          lt: new Date()
        },
        migrationStatus: {
          in: ['MIGRATED', 'REJECTED', 'FAILED']
        }
      }
    });

    console.log(`[OrderStagingService] Cleaned up ${deleted.count} expired staging records`);
    return deleted.count;
  }

  /**
   * Get staging statistics for admin dashboard
   */
  async getAdminStagingStats() {
    const [totalPending, formatsPendingApproval, oldestPending] = await Promise.all([
      prisma.orderStaging.count({
        where: { migrationStatus: 'PENDING' }
      }),
      prisma.orderStaging.groupBy({
        by: ['brokerCsvFormatId'],
        where: { migrationStatus: 'PENDING' },
        _count: { id: true }
      }),
      prisma.orderStaging.findFirst({
        where: { migrationStatus: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })
    ]);

    return {
      totalPending,
      formatsPendingApproval: formatsPendingApproval.length,
      formatDetails: formatsPendingApproval.map(f => ({
        formatId: f.brokerCsvFormatId,
        pendingCount: f._count.id
      })),
      oldestPendingDate: oldestPending?.createdAt
    };
  }
}