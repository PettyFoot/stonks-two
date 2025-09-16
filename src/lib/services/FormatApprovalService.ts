import { prisma } from '@/lib/prisma';
import { InputValidator } from '@/lib/security/InputValidator';
import { StagingMonitor } from '@/lib/monitoring/StagingMonitor';
import type { BrokerCsvFormat, OrderStaging, MigrationStatus } from '@prisma/client';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
  formatId: string;
  duration: number;
}

export interface ApprovalResult extends MigrationResult {
  format: BrokerCsvFormat;
  rollbackAvailable: boolean;
}

/**
 * Service for managing format approval and order migration
 * Handles the critical process of approving AI formats and migrating staged orders
 */
export class FormatApprovalService {
  private static readonly BATCH_SIZE = 100;
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Approve a format and migrate all staged orders
   */
  async approveFormatAndMigrateOrders(
    formatId: string,
    adminUserId: string,
    correctedMappings?: any,
    idempotencyKey?: string
  ): Promise<ApprovalResult> {
    const startTime = Date.now();

    // Check idempotency to prevent duplicate operations
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(idempotencyKey);
      if (existing) {
        console.log(`[FormatApprovalService] Idempotent operation found for key: ${idempotencyKey}`);
        return existing;
      }
    }

    try {
      console.log(`[FormatApprovalService] Starting approval for format ${formatId} by admin ${adminUserId}`);

      const result = await prisma.$transaction(async (tx) => {
        // Lock format for update to prevent concurrent modifications
        const format = await tx.$queryRaw<BrokerCsvFormat[]>`
          SELECT * FROM broker_csv_formats
          WHERE id = ${formatId}
          FOR UPDATE NOWAIT
        `;

        if (!format || format.length === 0) {
          throw new Error(`Format ${formatId} not found`);
        }

        const formatRecord = format[0];

        if (formatRecord.isApproved) {
          throw new Error(`Format ${formatId} is already approved`);
        }

        // Update format with approval
        const updatedFormat = await tx.brokerCsvFormat.update({
          where: { id: formatId },
          data: {
            isApproved: true,
            approvedBy: adminUserId,
            approvedAt: new Date(),
            fieldMappings: correctedMappings || formatRecord.fieldMappings
          }
        });

        // Get count of staged orders for this format
        const stagingCount = await tx.orderStaging.count({
          where: {
            brokerCsvFormatId: formatId,
            migrationStatus: 'PENDING'
          }
        });

        console.log(`[FormatApprovalService] Found ${stagingCount} staged orders to migrate`);

        if (stagingCount === 0) {
          return {
            format: updatedFormat,
            migratedCount: 0,
            failedCount: 0,
            errors: []
          };
        }

        // Migrate orders in batches
        const migrationResult = await this.migrateStagedOrdersBatch(
          tx,
          formatId,
          updatedFormat.fieldMappings
        );

        return {
          format: updatedFormat,
          ...migrationResult
        };

      }, {
        isolationLevel: 'Serializable',
        maxWait: 5000,     // 5 seconds max wait for lock
        timeout: 120000    // 2 minutes total timeout
      });

      const duration = Date.now() - startTime;

      // Log successful approval
      const approvalResult: ApprovalResult = {
        success: true,
        formatId,
        duration,
        rollbackAvailable: true,
        ...result
      };

      if (idempotencyKey) {
        await this.recordIdempotency(idempotencyKey, approvalResult);
      }

      // Update AiIngestToCheck if exists
      await this.updateAiIngestCheck(formatId, adminUserId);

      console.log(
        `[FormatApprovalService] Successfully approved format ${formatId}: ` +
        `${result.migratedCount} migrated, ${result.failedCount} failed, ${duration}ms`
      );

      // Record monitoring metrics
      await StagingMonitor.trackApproval(formatId, true, duration);
      await StagingMonitor.trackMigration(
        formatId,
        result.migratedCount > 0,
        duration,
        result.migratedCount + result.failedCount,
        result.failedCount
      );

      return approvalResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[FormatApprovalService] Approval failed for format ${formatId}:`, error);

      // Log failed approval
      const errorResult: ApprovalResult = {
        success: false,
        formatId,
        duration,
        migratedCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        format: {} as BrokerCsvFormat,
        rollbackAvailable: false
      };

      if (idempotencyKey) {
        await this.recordIdempotency(idempotencyKey, errorResult);
      }

      // Record failed approval metrics
      await StagingMonitor.trackApproval(formatId, false, duration);

      throw error;
    }
  }

  /**
   * Migrate staged orders in batches with error recovery
   */
  private async migrateStagedOrdersBatch(
    tx: any,
    formatId: string,
    fieldMappings: any
  ): Promise<{ migratedCount: number; failedCount: number; errors: string[] }> {
    let migratedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    let cursor: string | undefined;

    while (true) {
      // Get next batch of staged orders
      const staged = await tx.orderStaging.findMany({
        where: {
          brokerCsvFormatId: formatId,
          migrationStatus: 'PENDING'
        },
        take: FormatApprovalService.BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' }
      });

      if (staged.length === 0) break;

      // Process this batch
      const batchResult = await this.processMigrationBatch(tx, staged, fieldMappings);
      migratedCount += batchResult.migratedCount;
      failedCount += batchResult.failedCount;
      errors.push(...batchResult.errors);

      // Update cursor for next batch
      cursor = staged[staged.length - 1].id;

      // Log progress for large batches
      if ((migratedCount + failedCount) % 1000 === 0) {
        console.log(`[FormatApprovalService] Migration progress: ${migratedCount} migrated, ${failedCount} failed`);
      }
    }

    return { migratedCount, failedCount, errors };
  }

  /**
   * Process a single batch of staged orders
   */
  private async processMigrationBatch(
    tx: any,
    staged: OrderStaging[],
    fieldMappings: any
  ): Promise<{ migratedCount: number; failedCount: number; errors: string[] }> {
    const ordersToCreate: any[] = [];
    const successfulStagingIds: string[] = [];
    const failedStagingIds: string[] = [];
    const errors: string[] = [];

    // Transform each staged record
    for (const record of staged) {
      try {
        const mappedData = this.applyApprovedMappings(record.rawCsvRow, fieldMappings);
        const validatedData = InputValidator.validateStagingOrderData(mappedData);

        ordersToCreate.push({
          userId: record.userId,
          importBatchId: record.importBatchId,
          orderId: `${record.id}-${Date.now()}`, // Ensure uniqueness
          symbol: validatedData.symbol,
          orderType: validatedData.orderType,
          side: validatedData.side,
          timeInForce: 'DAY', // Default
          orderQuantity: validatedData.quantity,
          limitPrice: validatedData.limitPrice,
          stopPrice: validatedData.stopPrice,
          orderStatus: 'FILLED', // Assuming these are historical filled orders
          orderPlacedTime: validatedData.orderPlacedTime,
          orderExecutedTime: validatedData.orderExecutedTime,
          accountId: validatedData.accountId,
          orderAccount: validatedData.accountId,
          brokerType: 'GENERIC_CSV',
          datePrecision: 'MILLISECOND',
          tags: [],
          usedInTrade: false
        });

        successfulStagingIds.push(record.id);
      } catch (error) {
        failedStagingIds.push(record.id);
        errors.push(`Row ${record.rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    let migratedCount = 0;
    let failedCount = failedStagingIds.length;

    // Bulk insert successful orders
    if (ordersToCreate.length > 0) {
      try {
        const createdOrders = await tx.order.createMany({
          data: ordersToCreate,
          skipDuplicates: true
        });

        migratedCount = createdOrders.count;

        // Mark staging records as migrated
        await tx.orderStaging.updateMany({
          where: { id: { in: successfulStagingIds } },
          data: {
            migrationStatus: 'MIGRATED',
            migratedAt: new Date(),
            processingDurationMs: Date.now() - new Date(staged[0].createdAt).getTime()
          }
        });
      } catch (error) {
        // If bulk creation fails, mark all as failed
        failedCount += ordersToCreate.length;
        errors.push(`Bulk order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        await tx.orderStaging.updateMany({
          where: { id: { in: successfulStagingIds } },
          data: { migrationStatus: 'FAILED' }
        });
      }
    }

    // Mark failed staging records
    if (failedStagingIds.length > 0) {
      await tx.orderStaging.updateMany({
        where: { id: { in: failedStagingIds } },
        data: {
          migrationStatus: 'FAILED',
          processingErrors: errors
        }
      });
    }

    return { migratedCount, failedCount, errors };
  }

  /**
   * Apply approved mappings to raw CSV data
   */
  private applyApprovedMappings(rawRow: any, fieldMappings: any): any {
    const result: any = {};

    try {
      for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
        const value = rawRow[csvColumn];

        if (value !== undefined && value !== null && value !== '') {
          // Handle different mapping formats
          if (typeof mapping === 'object' && mapping !== null) {
            if ('field' in mapping) {
              result[mapping.field as string] = this.transformValue(value, mapping);
            } else if ('fields' in mapping && Array.isArray(mapping.fields)) {
              // Map to multiple fields
              mapping.fields.forEach((field: string) => {
                result[field] = this.transformValue(value, mapping);
              });
            }
          } else if (typeof mapping === 'string') {
            result[mapping] = value;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('[FormatApprovalService] Mapping application failed:', error);
      throw new Error(`Failed to apply mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform value based on mapping configuration
   */
  private transformValue(value: any, mapping: any): any {
    // Apply any transformations specified in the mapping
    if (mapping && typeof mapping === 'object' && 'transform' in mapping) {
      switch (mapping.transform) {
        case 'uppercase':
          return String(value).toUpperCase();
        case 'lowercase':
          return String(value).toLowerCase();
        case 'number':
          return Number(value);
        case 'date':
          return new Date(value);
        default:
          return value;
      }
    }

    return value;
  }

  /**
   * Reject a format and mark all staged orders as rejected
   */
  async rejectFormat(
    formatId: string,
    adminUserId: string,
    reason: string
  ): Promise<{ rejectedCount: number }> {
    return await prisma.$transaction(async (tx) => {
      // Mark all staged orders as rejected
      const rejectedResult = await tx.orderStaging.updateMany({
        where: {
          brokerCsvFormatId: formatId,
          migrationStatus: 'PENDING'
        },
        data: {
          migrationStatus: 'REJECTED',
          processingErrors: [reason]
        }
      });

      // Update AiIngestToCheck if exists
      await tx.aiIngestToCheck.updateMany({
        where: { brokerCsvFormatId: formatId },
        data: {
          adminReviewStatus: 'DISMISSED',
          adminReviewedAt: new Date(),
          adminReviewedBy: adminUserId,
          adminNotes: reason
        }
      });

      console.log(`[FormatApprovalService] Rejected format ${formatId}: ${rejectedResult.count} orders rejected`);

      return { rejectedCount: rejectedResult.count };
    });
  }

  /**
   * Check idempotency key to prevent duplicate operations
   */
  private async checkIdempotency(key: string): Promise<ApprovalResult | null> {
    // This would typically be stored in a separate table or cache
    // For now, we'll use a simple implementation
    return null; // TODO: Implement proper idempotency storage
  }

  /**
   * Record idempotency result
   */
  private async recordIdempotency(key: string, result: ApprovalResult): Promise<void> {
    // TODO: Implement proper idempotency storage
    console.log(`[FormatApprovalService] Recording idempotency key: ${key}`);
  }

  /**
   * Update AiIngestToCheck record
   */
  private async updateAiIngestCheck(formatId: string, adminUserId: string): Promise<void> {
    try {
      await prisma.aiIngestToCheck.updateMany({
        where: { brokerCsvFormatId: formatId },
        data: {
          adminReviewStatus: 'APPROVED',
          adminReviewedAt: new Date(),
          adminReviewedBy: adminUserId
        }
      });
    } catch (error) {
      console.warn('[FormatApprovalService] Failed to update AiIngestToCheck:', error);
      // Don't fail the whole operation for this
    }
  }

  /**
   * Get approval statistics for admin dashboard
   */
  async getApprovalStats(timeframe: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const [approvedFormats, pendingFormats, rejectedOrders, migratedOrders] = await Promise.all([
      prisma.brokerCsvFormat.count({
        where: {
          isApproved: true,
          approvedAt: { gte: startDate }
        }
      }),
      prisma.brokerCsvFormat.count({
        where: { isApproved: false }
      }),
      prisma.orderStaging.count({
        where: {
          migrationStatus: 'REJECTED',
          updatedAt: { gte: startDate }
        }
      }),
      prisma.orderStaging.count({
        where: {
          migrationStatus: 'MIGRATED',
          migratedAt: { gte: startDate }
        }
      })
    ]);

    return {
      approvedFormats,
      pendingFormats,
      rejectedOrders,
      migratedOrders,
      timeframe
    };
  }

  /**
   * Process orphaned staging records for already-approved formats
   * This handles edge cases where migration might have failed during initial approval
   */
  async processOrphanedStagingRecords(adminUserId: string): Promise<{
    success: boolean;
    processedCount: number;
    errorCount: number;
    skippedCount: number;
    approvedFormatsChecked: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      console.log('[FormatApprovalService] Starting orphaned staging records processing');

      // Find all approved formats that have pending staging records
      const approvedFormatsWithPending = await prisma.brokerCsvFormat.findMany({
        where: {
          isApproved: true,
          orderStaging: {
            some: {
              migrationStatus: 'PENDING'
            }
          }
        },
        include: {
          _count: {
            select: {
              orderStaging: {
                where: { migrationStatus: 'PENDING' }
              }
            }
          }
        }
      });

      console.log(`[FormatApprovalService] Found ${approvedFormatsWithPending.length} approved formats with pending staging records`);

      // Process each format
      for (const format of approvedFormatsWithPending) {
        try {
          console.log(`[FormatApprovalService] Processing format ${format.id}: ${format._count.orderStaging} pending records`);

          const result = await prisma.$transaction(async (tx) => {
            // Get all pending staging records for this format
            const pendingStaging = await tx.orderStaging.findMany({
              where: {
                brokerCsvFormatId: format.id,
                migrationStatus: 'PENDING'
              },
              orderBy: { createdAt: 'asc' }
            });

            if (pendingStaging.length === 0) {
              return { migratedCount: 0, failedCount: 0, errors: [] };
            }

            // Use the existing migration logic
            return await this.migrateStagedOrdersBatch(
              tx,
              format.id,
              format.fieldMappings
            );
          }, {
            isolationLevel: 'Serializable',
            maxWait: 10000,
            timeout: 300000 // 5 minutes for large batches
          });

          processedCount += result.migratedCount;
          errorCount += result.failedCount;
          errors.push(...result.errors);

          console.log(`[FormatApprovalService] Format ${format.id}: ${result.migratedCount} migrated, ${result.failedCount} failed`);

        } catch (error) {
          const errorMsg = `Format ${format.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('[FormatApprovalService] Format processing failed:', errorMsg);
          errors.push(errorMsg);
          errorCount += format._count.orderStaging;
        }
      }

      const duration = Date.now() - startTime;
      const success = errorCount === 0;

      console.log(
        `[FormatApprovalService] Orphaned staging processing completed: ` +
        `${processedCount} processed, ${errorCount} errors, ${skippedCount} skipped, ${duration}ms`
      );

      // Record metrics
      await StagingMonitor.trackMigration(
        'manual_processing',
        success,
        duration,
        processedCount + errorCount,
        errorCount
      );

      return {
        success,
        processedCount,
        errorCount,
        skippedCount,
        approvedFormatsChecked: approvedFormatsWithPending.length,
        errors
      };

    } catch (error) {
      console.error('[FormatApprovalService] Orphaned staging processing failed:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        processedCount,
        errorCount: errorCount + 1,
        skippedCount,
        approvedFormatsChecked: 0,
        errors
      };
    }
  }

  /**
   * Get statistics about pending staging records for approved formats
   */
  async getPendingStagingStats(): Promise<{
    pendingCount: number;
    approvedFormatsWithPending: number;
    oldestPendingHours: number;
  }> {
    try {
      const [pendingCount, approvedFormatsWithPending, oldestPending] = await Promise.all([
        // Count all pending staging records for approved formats
        prisma.orderStaging.count({
          where: {
            migrationStatus: 'PENDING',
            brokerCsvFormat: {
              isApproved: true
            }
          }
        }),

        // Count approved formats that have pending staging records
        prisma.brokerCsvFormat.count({
          where: {
            isApproved: true,
            orderStaging: {
              some: {
                migrationStatus: 'PENDING'
              }
            }
          }
        }),

        // Find oldest pending staging record for approved format
        prisma.orderStaging.findFirst({
          where: {
            migrationStatus: 'PENDING',
            brokerCsvFormat: {
              isApproved: true
            }
          },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        })
      ]);

      const oldestPendingHours = oldestPending
        ? (Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60)
        : 0;

      return {
        pendingCount,
        approvedFormatsWithPending,
        oldestPendingHours
      };

    } catch (error) {
      console.error('[FormatApprovalService] Failed to get pending staging stats:', error);
      return {
        pendingCount: 0,
        approvedFormatsWithPending: 0,
        oldestPendingHours: 0
      };
    }
  }
}