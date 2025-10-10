import { prisma } from '@/lib/prisma';
import { InputValidator } from '@/lib/security/InputValidator';
import { StagingMonitor } from '@/lib/monitoring/StagingMonitor';
import type { BrokerCsvFormat, OrderStaging, MigrationStatus, BrokerType } from '@prisma/client';

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
          },
          include: {
            broker: true
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

        // Calculate broker type from broker name
        const brokerType = this.getBrokerTypeFromName(updatedFormat.broker.name);
        console.log(`[FormatApprovalService] Using broker type: ${brokerType} for broker: ${updatedFormat.broker.name}`);

        // Migrate orders in batches
        const migrationResult = await this.migrateStagedOrdersBatch(
          tx,
          formatId,
          updatedFormat.fieldMappings,
          brokerType,
          updatedFormat.brokerId // Pass brokerId from format
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
    fieldMappings: any,
    brokerType: BrokerType,
    brokerId: string
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
      const batchResult = await this.processMigrationBatch(tx, staged, fieldMappings, brokerType, brokerId);
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
    fieldMappings: any,
    brokerType: BrokerType,
    brokerId: string
  ): Promise<{ migratedCount: number; failedCount: number; errors: string[] }> {
    const ordersToCreate: any[] = [];
    const successfulStagingIds: string[] = [];
    const failedStagingIds: string[] = [];
    const errors: string[] = [];
    const detailedErrors: Map<string, string[]> = new Map();
    const duplicates: Array<{
      stagingId: string;
      existingOrderId: string;
      symbol: string;
      executedTime: string;
    }> = [];

    // Transform each staged record
    for (const record of staged) {
      const recordErrors: string[] = [];

      try {
        console.log(`[Migration] Processing record ${record.id} (row ${record.rowIndex})`);

        // Step 1: Apply mappings
        let mappedData;
        try {
          mappedData = this.applyApprovedMappings(record.rawCsvRow, fieldMappings);
          console.log(`[Migration] Mapped data:`, JSON.stringify(mappedData, null, 2));
        } catch (error) {
          const msg = `Mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          recordErrors.push(msg);
          throw new Error(msg);
        }

        // Step 2: Infer side from quantity sign if side not explicitly mapped
        let normalizedData;
        try {
          normalizedData = this.inferSideFromQuantity(mappedData);
          console.log(`[Migration] After side inference:`, JSON.stringify({
            side: normalizedData.side,
            quantity: normalizedData.quantity || normalizedData.orderQuantity
          }));
        } catch (error) {
          const msg = `Side inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          recordErrors.push(msg);
          throw new Error(msg);
        }

        // Step 3: Validate the data
        let validatedData;
        try {
          validatedData = InputValidator.validateStagingOrderData(normalizedData);
          console.log(`[Migration] Validation successful for record ${record.id}`);
        } catch (error) {
          const msg = `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          recordErrors.push(msg);

          // Log detailed validation context
          console.error(`[Migration] Validation error for record ${record.id}:`, {
            error: msg,
            rawData: record.rawCsvRow,
            mappedData,
            normalizedData
          });

          throw new Error(msg);
        }

        // Step 4: Check for duplicates
        const existingOrder = await tx.order.findFirst({
          where: {
            userId: record.userId,
            symbol: validatedData.symbol,
            orderExecutedTime: validatedData.orderExecutedTime,
            brokerId: brokerId
          },
          select: { id: true, orderId: true }
        });

        if (existingOrder) {
          // Mark as duplicate and skip migration
          duplicates.push({
            stagingId: record.id,
            existingOrderId: existingOrder.id,
            symbol: validatedData.symbol,
            executedTime: validatedData.orderExecutedTime.toISOString()
          });

          const duplicateMsg = `Duplicate order exists (Order ID: ${existingOrder.id})`;
          recordErrors.push(duplicateMsg);
          failedStagingIds.push(record.id);
          detailedErrors.set(record.id, [duplicateMsg]);

          console.log(`[Migration] Duplicate found for record ${record.id}: existing order ${existingOrder.id}`);
          continue; // Skip this record
        }

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
          brokerType: brokerType,
          brokerId: brokerId, // From BrokerCsvFormat passed as parameter
          datePrecision: 'MILLISECOND',
          tags: [],
          usedInTrade: false
        });

        successfulStagingIds.push(record.id);
      } catch (error) {
        failedStagingIds.push(record.id);
        const errorMessage = `Row ${record.rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);

        // Log detailed error information for debugging
        console.error(`[Migration] FAILED record ${record.id} (row ${record.rowIndex}):`, {
          error: errorMessage,
          symbol: (record.rawCsvRow as any)?.symbol || 'N/A',
          rawData: record.rawCsvRow
        });

        // Store detailed errors for this record
        detailedErrors.set(record.id, recordErrors.length > 0 ? recordErrors : [errorMessage]);
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

    // Mark failed staging records with detailed errors
    if (failedStagingIds.length > 0) {
      // Update each failed record individually with its specific errors
      for (const failedId of failedStagingIds) {
        const recordErrors = detailedErrors.get(failedId) || [`Row failed: ${errors.find(e => e.includes(failedId)) || 'Unknown error'}`];

        await tx.orderStaging.update({
          where: { id: failedId },
          data: {
            migrationStatus: 'FAILED',
            processingErrors: recordErrors,
            retryCount: { increment: 1 },
            lastRetryAt: new Date()
          }
        });
      }
    }

    // Send admin email notification if duplicates were found
    if (duplicates.length > 0 && staged.length > 0) {
      try {
        // Get import batch and user info for email
        const firstRecord = staged[0];
        const importBatch = await tx.importBatch.findUnique({
          where: { id: firstRecord.importBatchId },
          select: { filename: true, userId: true }
        });

        const user = await tx.user.findUnique({
          where: { id: firstRecord.userId },
          select: { email: true }
        });

        const format = await tx.brokerCsvFormat.findUnique({
          where: { id: firstRecord.brokerCsvFormatId },
          include: { broker: true }
        });

        if (importBatch && user && format) {
          // Import emailService dynamically to avoid circular dependencies
          const { emailService } = await import('@/lib/email/emailService');

          await emailService.sendDuplicateOrdersNotification({
            importBatchId: firstRecord.importBatchId,
            filename: importBatch.filename,
            userId: firstRecord.userId,
            userEmail: user.email,
            formatName: format.formatName,
            brokerName: format.broker.name,
            duplicates: duplicates,
            timestamp: new Date().toISOString()
          });

          console.log(`[FormatApprovalService] Sent duplicate notification email: ${duplicates.length} duplicates found`);
        }
      } catch (emailError) {
        // Don't fail migration if email fails
        console.error('[FormatApprovalService] Failed to send duplicate notification email:', emailError);
      }
    }

    return { migratedCount, failedCount, errors };
  }

  /**
   * Apply approved mappings to raw CSV data
   */
  private applyApprovedMappings(rawRow: any, fieldMappings: any): any {
    const result: any = {};
    const dateFields = ['orderPlacedTime', 'orderExecutedTime', 'tradeDate', 'executionTime', 'settlementDate'];

    try {
      for (const [csvColumn, mapping] of Object.entries(fieldMappings)) {
        // Use combineFieldValues to handle field combinations (e.g., date + time)
        const value = this.combineFieldValues(rawRow, csvColumn, mapping);

        if (value !== undefined && value !== null && value !== '') {
          // Handle different mapping formats
          if (typeof mapping === 'object' && mapping !== null) {
            if ('field' in mapping) {
              const field = mapping.field as string;
              let transformedValue = this.transformValue(value, mapping);

              // Auto-detect and parse date fields even if transform isn't specified
              if (dateFields.includes(field) && typeof transformedValue === 'string') {
                transformedValue = this.parseDateWithMultipleFormats(transformedValue);
              }

              result[field] = transformedValue;
            } else if ('fields' in mapping && Array.isArray(mapping.fields)) {
              // Map to multiple fields
              mapping.fields.forEach((field: string) => {
                let transformedValue = this.transformValue(value, mapping);

                // Auto-detect and parse date fields even if transform isn't specified
                if (dateFields.includes(field) && typeof transformedValue === 'string') {
                  transformedValue = this.parseDateWithMultipleFormats(transformedValue);
                }

                result[field] = transformedValue;
              });
            }
          } else if (typeof mapping === 'string') {
            let finalValue = value;

            // Auto-detect and parse date fields
            if (dateFields.includes(mapping) && typeof finalValue === 'string') {
              finalValue = this.parseDateWithMultipleFormats(finalValue);
            }

            result[mapping] = finalValue;
          }
        }
      }

      // Auto-fill missing timestamp fields with available timestamp data
      // This handles CSVs that only have one timestamp field
      if (!result.orderPlacedTime && result.orderExecutedTime) {
        result.orderPlacedTime = result.orderExecutedTime;
        console.log('[FormatApprovalService] Auto-filled orderPlacedTime from orderExecutedTime');
      }

      if (!result.orderExecutedTime && result.orderPlacedTime) {
        result.orderExecutedTime = result.orderPlacedTime;
        console.log('[FormatApprovalService] Auto-filled orderExecutedTime from orderPlacedTime');
      }

      return result;
    } catch (error) {
      console.error('[FormatApprovalService] Mapping application failed:', error);
      throw new Error(`Failed to apply mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to combine multiple CSV field values into one string
   * Used when a field mapping has combinedWith array (e.g., separate date and time columns)
   */
  private combineFieldValues(row: Record<string, unknown>, primaryHeader: string, mapping: any): unknown {
    // If no combinedWith array, return the primary value as-is
    if (!mapping.combinedWith || !Array.isArray(mapping.combinedWith) || mapping.combinedWith.length === 0) {
      return row[primaryHeader];
    }

    // Collect all values to combine
    const values: string[] = [];

    // Add primary value
    const primaryValue = row[primaryHeader];
    if (primaryValue !== undefined && primaryValue !== null && primaryValue !== '') {
      values.push(String(primaryValue).trim());
    }

    // Add combined values in order
    for (const combinedHeader of mapping.combinedWith) {
      const combinedValue = row[combinedHeader];
      if (combinedValue !== undefined && combinedValue !== null && combinedValue !== '') {
        values.push(String(combinedValue).trim());
      }
    }

    // If we have no values, return empty
    if (values.length === 0) {
      return '';
    }

    // If we have only one value, return it as-is
    if (values.length === 1) {
      return values[0];
    }

    // Combine values with a space separator
    // Example: "2024/07/15" + "10:14:41" = "2024/07/15 10:14:41"
    console.log(`[FormatApprovalService] Combining fields: ${primaryHeader} + [${mapping.combinedWith.join(', ')}] = "${values.join(' ')}"`);
    return values.join(' ');
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
          return this.parseDateWithMultipleFormats(value);
        default:
          return value;
      }
    }

    return value;
  }

  /**
   * Parse date string with support for multiple common formats
   * Handles broker-specific date formats and edge cases
   */
  private parseDateWithMultipleFormats(dateStr: any): string {
    if (!dateStr) return dateStr;

    const str = String(dateStr).trim();

    // Try parsing common broker date formats
    const formats = [
      // ISO format: 2024-07-15T10:14:41.000Z
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // MM/DD/YYYY HH:mm:ss
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      // YYYY/MM/DD HH:mm:ss
      /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      // MM-DD-YYYY HH:mm:ss
      /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      // MM/DD/YYYY (date only)
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY/MM/DD (date only)
      /^(\d{4})\/(\d{2})\/(\d{2})$/,
      // MM-DD-YYYY (date only)
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY-MM-DD (date only)
      /^(\d{4})-(\d{2})-(\d{2})$/
    ];

    // First, try standard Date parsing (works for ISO format)
    const standardParse = new Date(str);
    if (!isNaN(standardParse.getTime())) {
      return standardParse.toISOString();
    }

    // Try MM/DD/YYYY HH:mm:ss format (common in US brokers)
    const usDateTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (usDateTimeMatch) {
      const [_, month, day, year, hour, minute, second] = usDateTimeMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try YYYY/MM/DD HH:mm:ss format
    const isoLikeDateTimeMatch = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (isoLikeDateTimeMatch) {
      const [_, year, month, day, hour, minute, second] = isoLikeDateTimeMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try MM/DD/YYYY date only format
    const usDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usDateMatch) {
      const [_, month, day, year] = usDateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try YYYY/MM/DD or YYYY-MM-DD date only format
    const isoDateMatch = str.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
    if (isoDateMatch) {
      const [_, year, month, day] = isoDateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    console.warn(`[FormatApprovalService] Could not parse date: "${str}". Returning original value.`);
    return str; // Return original if all parsing attempts fail
  }

  /**
   * Infer side from quantity sign and normalize quantity to absolute value
   * This handles CSV files that use negative quantities to indicate SELL orders
   * Also attempts to infer from other fields like action, transactionType, etc.
   */
  private inferSideFromQuantity(mappedData: any): any {
    // If side already explicitly mapped and valid, return as-is
    if (mappedData.side) {
      const normalizedSide = String(mappedData.side).toUpperCase().trim();
      const validSides = ['BUY', 'SELL', 'BOT', 'SLD', 'B', 'S', 'BOUGHT', 'SOLD', 'YOU BOUGHT', 'YOU SOLD'];
      if (validSides.includes(normalizedSide)) {
        return mappedData;
      }
    }

    // Try to infer from various transaction/action fields
    const actionFields = ['action', 'transactionType', 'type', 'transaction', 'orderAction'];
    for (const field of actionFields) {
      if (mappedData[field]) {
        const value = String(mappedData[field]).toUpperCase().trim();

        // Check for buy indicators
        if (value.includes('BUY') || value.includes('BOT') || value === 'B' || value.includes('BOUGHT') || value.includes('PURCHASE')) {
          mappedData.side = 'BUY';
          console.log(`[FormatApprovalService] Inferred BUY from ${field}: "${mappedData[field]}"`);
          break;
        }

        // Check for sell indicators
        if (value.includes('SELL') || value.includes('SLD') || value === 'S' || value.includes('SOLD')) {
          mappedData.side = 'SELL';
          console.log(`[FormatApprovalService] Inferred SELL from ${field}: "${mappedData[field]}"`);
          break;
        }
      }
    }

    // If still no side, try to infer from quantity sign
    if (!mappedData.side) {
      // Get quantity (check both fields)
      const qty = mappedData.quantity || mappedData.orderQuantity;

      if (qty !== undefined && qty !== null && qty !== '') {
        const numQty = Number(qty);

        if (!isNaN(numQty) && numQty !== 0) {
          // Infer side from sign and normalize to absolute value
          if (numQty < 0) {
            mappedData.side = 'SELL';
            mappedData.orderQuantity = Math.abs(numQty);
            mappedData.quantity = Math.abs(numQty);
            console.log(`[FormatApprovalService] Inferred SELL from negative quantity: ${qty} → ${Math.abs(numQty)}`);
          } else if (numQty > 0) {
            mappedData.side = 'BUY';
            mappedData.orderQuantity = Math.abs(numQty);
            mappedData.quantity = Math.abs(numQty);
            console.log(`[FormatApprovalService] Inferred BUY from positive quantity: ${qty}`);
          }
        }
      }
    }

    // If we still don't have a side, log a warning
    if (!mappedData.side) {
      console.warn(`[FormatApprovalService] Could not infer side from any field. Available fields:`, Object.keys(mappedData));
    }

    return mappedData;
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
    const skippedCount = 0;
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
          broker: true,
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

          // Calculate broker type from broker name
          const brokerType = this.getBrokerTypeFromName(format.broker.name);

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
              format.fieldMappings,
              brokerType,
              format.brokerId // Pass brokerId from format
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

  /**
   * Convert broker name to BrokerType enum
   */
  private getBrokerTypeFromName(brokerName: string): BrokerType {
    const normalized = brokerName.toLowerCase();

    if (normalized.includes('interactive') || normalized.includes('ibkr')) {
      return 'INTERACTIVE_BROKERS' as BrokerType;
    } else if (normalized.includes('schwab') || normalized.includes('charles')) {
      return 'CHARLES_SCHWAB' as BrokerType;
    } else if (normalized.includes('ameritrade') || normalized.includes('thinkorswim') || normalized.includes('tos')) {
      return 'TD_AMERITRADE' as BrokerType;
    } else if (normalized.includes('etrade') || normalized.includes('e*trade')) {
      return 'E_TRADE' as BrokerType;
    } else if (normalized.includes('fidelity')) {
      return 'FIDELITY' as BrokerType;
    } else if (normalized.includes('robinhood')) {
      return 'ROBINHOOD' as BrokerType;
    } else {
      return 'GENERIC_CSV' as BrokerType;
    }
  }
}