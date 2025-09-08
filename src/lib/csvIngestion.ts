import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';
import { BrokerType, OrderType, TimeInForce, OrderStatus, Prisma } from '@prisma/client';
import { 
  StandardCsvRowSchema, 
  normalizeStandardCsvRow, 
  STANDARD_CSV_COLUMNS,
  REQUIRED_COLUMNS
} from '@/lib/schemas/standardCsv';
import { 
  CsvAiMapper, 
  type AiMappingResult, 
  type ColumnMapping
} from '@/lib/ai/csvMapper';
import { 
  CsvFormatDetector, 
  type CsvFormat, 
  DATA_TRANSFORMERS 
} from '@/lib/csvFormatRegistry';
import { TradeBuilder } from '@/lib/tradeBuilder';

export type CustomCsvRow = Record<string, string>;

// File size limits
export const FILE_SIZE_LIMITS = {
  SMALL: 5 * 1024 * 1024,    // 5MB - process immediately
  LARGE: 50 * 1024 * 1024,   // 50MB - process in background
  MAX: 100 * 1024 * 1024,    // 100MB - absolute maximum
} as const;

// CSV ingestion result
export interface CsvIngestionResult {
  success: boolean;
  importBatchId: string;
  importType: 'STANDARD' | 'CUSTOM';
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  aiMappingResult?: AiMappingResult;
  requiresUserReview: boolean;
  backgroundJobId?: string;
}

// CSV validation result
export interface CsvValidationResult {
  isValid: boolean;
  isStandardFormat: boolean;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
  errors: string[];
  fileSize: number;
  detectedFormat?: CsvFormat;
  formatConfidence?: number;
  formatReasoning?: string[];
}

// Schwab order data structure
interface SchwabOrder {
  symbol?: string;
  orderType?: string;
  side?: string;
  timeInForce?: string;
  orderQuantity?: number;
  limitPrice?: number;
  orderStatus?: string;
  orderPlacedTime?: Date;
  orderExecutedTime?: Date;
  orderCancelledTime?: Date;
  [key: string]: unknown;
}

// Schwab parse result structure
interface SchwabParseResult {
  workingOrders: SchwabOrder[];
  filledOrders: SchwabOrder[];
  cancelledOrders: SchwabOrder[];
  errors: string[];
}

// Order data structure for detected format mapping
interface NormalizedOrder {
  orderId: string;
  parentOrderId?: string | null;
  symbol: string;
  orderType: string;
  side: 'BUY' | 'SELL';
  timeInForce: string;
  orderQuantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  orderStatus: string;
  orderPlacedTime: Date;
  orderExecutedTime: Date;
  accountId?: string | null;
  orderAccount?: string | null;
  orderRoute?: string | null;
  tags: string[];
}

export class CsvIngestionService {
  private aiMapper: CsvAiMapper;
  private formatDetector: CsvFormatDetector;

  constructor() {
    // Initialize AI mapper with API key from environment
    const aiApiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.aiMapper = new CsvAiMapper(aiApiKey);
    this.formatDetector = new CsvFormatDetector();
  }

  // Validate and clean mappings to prevent conflicts
  private validateMappings(mappings: ColumnMapping[]): {
    validMappings: ColumnMapping[];
    conflicts: string[];
    suggestions: string[];
  } {
    const validMappings: ColumnMapping[] = [];
    const conflicts: string[] = [];
    const suggestions: string[] = [];
    const usedTargets = new Map<string, ColumnMapping>();
    
    // Sort mappings by priority and confidence
    const sortedMappings = [...mappings].sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return b.confidence - a.confidence;
    });
    
    for (const mapping of sortedMappings) {
      const existingMapping = usedTargets.get(mapping.targetColumn);
      
      if (existingMapping) {
        conflicts.push(
          `Conflict: Both "${existingMapping.sourceColumn}" and "${mapping.sourceColumn}" map to "${mapping.targetColumn}". ` +
          `Using "${existingMapping.sourceColumn}" (priority: ${existingMapping.priority || 0}, confidence: ${existingMapping.confidence})`
        );
        
        // Special suggestion for order ID conflicts
        if (mapping.targetColumn === 'orderId') {
          suggestions.push(
            `Suggestion: Consider mapping "${mapping.sourceColumn}" to "parentOrderId" or storing in brokerMetadata for relationship tracking`
          );
        }
      } else {
        validMappings.push(mapping);
        usedTargets.set(mapping.targetColumn, mapping);
      }
    }
    
    return {
      validMappings,
      conflicts,
      suggestions
    };
  }

  async validateCsvFile(fileContent: string): Promise<CsvValidationResult> {
    const fileSize = Buffer.byteLength(fileContent, 'utf8');
    
    if (fileSize > FILE_SIZE_LIMITS.MAX) {
      return {
        isValid: false,
        isStandardFormat: false,
        headers: [],
        sampleRows: [],
        rowCount: 0,
        errors: [`File size (${(fileSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${FILE_SIZE_LIMITS.MAX / 1024 / 1024}MB`],
        fileSize,
      };
    }

    try {
      // Special handling for Schwab "Today's Trade Activity" format
      const schwabPattern = /Today's Trade Activity for \d+\w*\s+.*on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i;
      const isSchwabFormat = schwabPattern.test(fileContent);
      
      if (isSchwabFormat) {
        // Parse Schwab format using our custom parser
        const { parseSchwabTodaysTrades } = await import('../../scripts/parseSchwabTodaysTrades');
        const schwabResult = parseSchwabTodaysTrades(fileContent);
        
        const totalTrades = schwabResult.workingOrders.length + 
                           schwabResult.filledOrders.length + 
                           schwabResult.cancelledOrders.length;
        
        // Create mock headers from first filled order (for UI display)
        const sampleOrder = schwabResult.filledOrders[0] || schwabResult.workingOrders[0] || schwabResult.cancelledOrders[0];
        const headers = sampleOrder ? Object.keys(sampleOrder) : ['symbol', 'side', 'orderQuantity', 'orderStatus'];
        const sampleRows = [schwabResult.filledOrders[0], schwabResult.workingOrders[0]].filter(Boolean).slice(0, 3);
        
        // Get Schwab format definition
        const { CsvFormatDetector } = await import('./csvFormatRegistry');
        const detector = new CsvFormatDetector();
        const formatDetection = detector.detectFormat(headers, sampleRows, fileContent);
        
        return {
          isValid: true,
          isStandardFormat: false,
          headers,
          sampleRows,
          rowCount: totalTrades,
          errors: schwabResult.errors,
          fileSize,
          detectedFormat: formatDetection.format || undefined,
          formatConfidence: formatDetection.confidence,
          formatReasoning: formatDetection.reasoning,
        };
      }
      
      // Standard CSV parsing for other formats
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle BOM for Excel files
      });

      if (records.length === 0) {
        return {
          isValid: false,
          isStandardFormat: false,
          headers: [],
          sampleRows: [],
          rowCount: 0,
          errors: ['CSV file is empty or contains no valid data'],
          fileSize,
        };
      }

      const headers = Object.keys(records[0] as Record<string, unknown>);
      const sampleRows = records.slice(0, 5) as Record<string, unknown>[]; // Get first 5 rows for analysis
      
      // Try automatic format detection first
      const formatDetection = this.formatDetector.detectFormat(headers, sampleRows, fileContent);
      
      // Check if it's standard format
      const isStandardFormat = this.isStandardCsvFormat(headers);

      return {
        isValid: true,
        isStandardFormat,
        headers,
        sampleRows,
        rowCount: records.length,
        errors: [],
        fileSize,
        detectedFormat: formatDetection.format || undefined,
        formatConfidence: formatDetection.confidence,
        formatReasoning: formatDetection.reasoning,
      };

    } catch (error) {
      return {
        isValid: false,
        isStandardFormat: false,
        headers: [],
        sampleRows: [],
        rowCount: 0,
        errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fileSize,
      };
    }
  }

  private isStandardCsvFormat(headers: string[]): boolean {
    // Check if all required columns are present
    const hasAllRequired = REQUIRED_COLUMNS.every(col => 
      headers.some(header => header.trim().toLowerCase() === col.toLowerCase())
    );

    // Check if majority of standard columns are present
    const standardColumnsPresent = STANDARD_CSV_COLUMNS.filter(col =>
      headers.some(header => header.trim().toLowerCase() === col.toLowerCase())
    ).length;

    const standardColumnRatio = standardColumnsPresent / STANDARD_CSV_COLUMNS.length;

    return hasAllRequired && standardColumnRatio >= 0.6;
  }

  async ingestCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[] = [],
    userMappings?: ColumnMapping[]
  ): Promise<CsvIngestionResult> {
    
    // First validate the file
    const validation = await this.validateCsvFile(fileContent);
    if (!validation.isValid) {
      throw new Error(`CSV validation failed: ${validation.errors.join(', ')}`);
    }

    // Log the upload attempt
    const uploadLog = await this.createUploadLog(
      userId, 
      fileName, 
      validation.headers, 
      validation.rowCount
    );

    try {
      // Check if this is a Schwab format specifically
      const schwabPattern = /Today's Trade Activity for \d+\w*\s+.*on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i;
      const isSchwabFormat = schwabPattern.test(fileContent);
      
      console.log('=== CSV Processing Debug ===');
      console.log('Detected format:', validation.detectedFormat?.id);
      console.log('Format confidence:', validation.formatConfidence);
      console.log('Is standard format:', validation.isStandardFormat);
      console.log('Is Schwab Today\'s format:', isSchwabFormat);
      console.log('Processing path will be:', 
        isSchwabFormat ? 'processSchwabCsv' :
        validation.isStandardFormat ? 'processStandardCsv' :
        validation.detectedFormat && validation.formatConfidence && validation.formatConfidence >= 0.7 ? 'processDetectedFormatCsv' :
        'processCustomCsv'
      );
      
      if (isSchwabFormat && !userMappings) {
        // Process as Schwab CSV
        return await this.processSchwabCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize
        );
      } else if (validation.isStandardFormat && !userMappings) {
        // Process as standard CSV
        return await this.processStandardCsv(
          fileContent, 
          fileName, 
          userId, 
          accountTags, 
          uploadLog.id,
          validation.fileSize
        );
      } else if (validation.detectedFormat && validation.formatConfidence && validation.formatConfidence >= 0.7 && !userMappings) {
        // Process with detected format
        console.log('Using processDetectedFormatCsv for format:', validation.detectedFormat.id);
        return await this.processDetectedFormatCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize,
          validation.detectedFormat
        );
      } else {
        // Process as custom CSV with AI mapping
        console.log('Using processCustomCsv, detected format:', validation.detectedFormat?.id || 'none');
        return await this.processCustomCsv(
          fileContent, 
          fileName, 
          userId, 
          accountTags, 
          uploadLog.id,
          validation.fileSize,
          userMappings,
          validation.detectedFormat
        );
      }
    } catch (error) {
      // Update upload log with error
      await this.updateUploadLog(uploadLog.id, 'FAILED', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async processStandardCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number
  ): Promise<CsvIngestionResult> {
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: 'GENERIC_CSV',
        importType: 'STANDARD',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: false,
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'STANDARD', undefined, importBatch.id);

    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each row
    for (let i = 0; i < records.length; i++) {
      try {
        // Validate row against standard schema
        const validatedRow = StandardCsvRowSchema.parse(records[i]);
        
        // Normalize to trade data
        const normalizedTrade = normalizeStandardCsvRow(validatedRow, accountTags);
        
        // Create trade record
        await prisma.trade.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            date: normalizedTrade.date,
            entryDate: normalizedTrade.date,
            symbol: normalizedTrade.symbol,
            side: normalizedTrade.side,
            quantity: normalizedTrade.volume,
            executions: 1,
            pnl: normalizedTrade.pnl,
            entryPrice: normalizedTrade.price,
            commission: normalizedTrade.commission,
            fees: normalizedTrade.fees,
            notes: normalizedTrade.notes,
            tags: normalizedTrade.tags,
          },
        });

        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
      }
    }

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

    // Calculate trades after successful import
    if (successCount > 0) {
      try {
        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);
      } catch (error) {
        console.error('Trade calculation error:', error);
        // Don't fail the import if trade calculation fails
      }
    }

    return {
      success: errorCount < records.length,
      importBatchId: importBatch.id,
      importType: 'STANDARD',
      totalRecords: records.length,
      successCount,
      errorCount,
      errors,
      requiresUserReview: false,
    };
  }

  private async processDetectedFormatCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number,
    detectedFormat: CsvFormat
  ): Promise<CsvIngestionResult> {
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (records.length === 0) {
      throw new Error('No data found in CSV file');
    }

    // Create import batch
    const brokerType = this.getBrokerTypeFromFormat(detectedFormat);
    console.log('processDetectedFormatCsv - Creating import batch with brokerType:', brokerType, 'for format:', detectedFormat.id);
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType,
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: false,
        mappingConfidence: detectedFormat.confidence,
        columnMappings: detectedFormat.fieldMappings,
        userReviewRequired: false,
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'STANDARD', undefined, importBatch.id);

    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each row using detected format mappings
    for (let i = 0; i < records.length; i++) {
      try {
        const normalizedOrder = this.applyDetectedFormatMapping(records[i] as Record<string, unknown>, detectedFormat, accountTags);
        
        // Create order record
        const orderBrokerType = this.getBrokerTypeFromFormat(detectedFormat);
        if (i === 0) {
          console.log('Creating first order with brokerType:', orderBrokerType, 'for format:', detectedFormat.id);
        }
        await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: normalizedOrder.orderId,
            parentOrderId: normalizedOrder.parentOrderId,
            symbol: normalizedOrder.symbol,
            orderType: normalizedOrder.orderType as OrderType,
            side: normalizedOrder.side,
            timeInForce: normalizedOrder.timeInForce as TimeInForce,
            orderQuantity: normalizedOrder.orderQuantity,
            limitPrice: normalizedOrder.limitPrice,
            stopPrice: normalizedOrder.stopPrice,
            orderStatus: normalizedOrder.orderStatus as OrderStatus,
            orderPlacedTime: normalizedOrder.orderPlacedTime,
            orderExecutedTime: normalizedOrder.orderExecutedTime,
            accountId: normalizedOrder.accountId,
            orderAccount: normalizedOrder.orderAccount,
            orderRoute: normalizedOrder.orderRoute,
            brokerType: orderBrokerType,
            tags: normalizedOrder.tags,
          },
        });

        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
      }
    }

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

    // Calculate trades after successful import
    if (successCount > 0) {
      try {
        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);
      } catch (error) {
        console.error('Trade calculation error:', error);
        // Don't fail the import if trade calculation fails
      }
    }

    return {
      success: errorCount < records.length,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      errors,
      requiresUserReview: false,
    };
  }

  private async processCustomCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number,
    userMappings?: ColumnMapping[],
    detectedFormat?: CsvFormat
  ): Promise<CsvIngestionResult> {
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (records.length === 0) {
      throw new Error('No data found in CSV file');
    }

    const headers = Object.keys(records[0] as Record<string, unknown>);
    let mappingResult: AiMappingResult;

    if (userMappings) {
      // Use user-provided mappings
      mappingResult = {
        mappings: userMappings,
        overallConfidence: 1.0,
        requiresUserReview: false,
        missingRequired: [],
        suggestions: [],
      };
    } else {
      // Use AI to generate mappings
      await this.updateUploadLog(uploadLogId, 'MAPPED', 'AI_MAPPED');
      mappingResult = await this.aiMapper.analyzeAndMapColumns(headers, records.slice(0, 10) as CustomCsvRow[]);
    }

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: detectedFormat ? this.getBrokerTypeFromFormat(detectedFormat) : BrokerType.GENERIC_CSV,
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: !userMappings,
        mappingConfidence: mappingResult.overallConfidence,
        columnMappings: mappingResult.mappings as unknown as Prisma.InputJsonValue,
        userReviewRequired: mappingResult.requiresUserReview,
      },
    });

    // If mapping confidence is too low or missing required fields, return for user review
    if (mappingResult.requiresUserReview) {
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { status: 'PENDING' },
      });

      return {
        success: false,
        importBatchId: importBatch.id,
        importType: 'CUSTOM',
        totalRecords: records.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        aiMappingResult: mappingResult,
        requiresUserReview: true,
      };
    }

    // Include detected format info in the mapping result if available
    if (detectedFormat && !userMappings) {
      mappingResult.detectedFormat = detectedFormat as unknown as Record<string, unknown>;
      mappingResult.formatConfidence = detectedFormat.confidence;
    }

    // Process with mappings
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Check if this is an order format (has orderId field mapping)
      const isOrderFormat = mappingResult.mappings.some(m => 'tradeVoyagerField' in m && m.tradeVoyagerField === 'orderId');
      const brokerType = detectedFormat ? this.getBrokerTypeFromFormat(detectedFormat) : BrokerType.GENERIC_CSV;
      
      if (isOrderFormat) {
        // Process as orders
        for (const [index, row] of records.entries()) {
          try {
            const mappedData: Record<string, unknown> = {};
            const mappedFields = new Set<string>(); // Track which target fields have been mapped
            const skippedMappings: string[] = []; // Track skipped mappings for logging
            
            // Apply mappings with first-match-wins logic
            for (const mapping of mappingResult.mappings) {
              if ('csvColumn' in mapping && 'tradeVoyagerField' in mapping) {
                const targetField = mapping.tradeVoyagerField as string;
                const csvColumn = mapping.csvColumn as string;
                
                // Check if target field already mapped (first-match-wins)
                if (mappedFields.has(targetField)) {
                  skippedMappings.push(`${csvColumn} -> ${targetField} (already mapped)`);
                  continue;
                }
                
                const value = (row as Record<string, unknown>)[csvColumn];
                if (value !== undefined && value !== null && value !== '') {
                  // Special handling for brokerMetadata - accumulate multiple values
                  if (targetField === 'brokerMetadata') {
                    if (!mappedData.brokerMetadata) {
                      mappedData.brokerMetadata = {};
                    }
                    (mappedData.brokerMetadata as Record<string, unknown>)[csvColumn] = value;
                  } else {
                    (mappedData as Record<string, unknown>)[targetField] = value;
                    mappedFields.add(targetField);
                  }
                }
              }
            }
            
            // Log skipped mappings for debugging
            if (skippedMappings.length > 0 && index === 0) { // Only log for first row to avoid spam
              console.log(`First-match-wins: Skipped ${skippedMappings.length} duplicate mappings for orders:`, skippedMappings);
            }
            
            // Create order record
            await prisma.order.create({
              data: {
                userId,
                importBatchId: importBatch.id,
                orderId: String(mappedData.orderId || `auto-${Date.now()}-${index}`),
                parentOrderId: mappedData.parentOrderId ? String(mappedData.parentOrderId) : null,
                symbol: String(mappedData.symbol || ''),
                orderType: this.normalizeOrderType(String(mappedData.orderType || 'MARKET')),
                side: this.normalizeOrderSide(String(mappedData.side || 'BUY')),
                timeInForce: this.normalizeTimeInForce(String(mappedData.timeInForce || 'DAY')),
                orderQuantity: Number(mappedData.orderQuantity) || 0,
                limitPrice: mappedData.limitPrice ? Number(mappedData.limitPrice) : null,
                stopPrice: mappedData.stopPrice ? Number(mappedData.stopPrice) : null,
                orderStatus: this.normalizeOrderStatus(String(mappedData.orderStatus || 'FILLED')),
                orderPlacedTime: mappedData.orderPlacedTime ? new Date(String(mappedData.orderPlacedTime)) : new Date(),
                orderExecutedTime: mappedData.orderExecutedTime ? new Date(String(mappedData.orderExecutedTime)) : new Date(),
                accountId: mappedData.accountId ? String(mappedData.accountId) : null,
                orderAccount: mappedData.orderAccount ? String(mappedData.orderAccount) : null,
                orderRoute: mappedData.orderRoute ? String(mappedData.orderRoute) : null,
                brokerType,
                tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
              },
            });
            
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        // Process as trades (existing logic)
        const normalizedTrades = this.aiMapper.applyMappings(records as CustomCsvRow[], mappingResult.mappings, accountTags);

        for (const [index, trade] of normalizedTrades.entries()) {
          try {
            await prisma.trade.create({
              data: {
                userId,
                importBatchId: importBatch.id,
                date: trade.date,
                entryDate: trade.date,
                symbol: trade.symbol,
                side: trade.side,
                quantity: trade.volume,
                executions: 1,
                pnl: trade.pnl,
                entryPrice: trade.price,
                commission: trade.commission,
                fees: trade.fees,
                notes: trade.notes,
                tags: trade.tags,
                brokerName: detectedFormat?.brokerName,
              },
            });

            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Mapping application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount = records.length;
    }

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    const parseMethod = userMappings ? 'USER_CORRECTED' : 'AI_MAPPED';
    await this.updateUploadLog(uploadLogId, 'IMPORTED', parseMethod, undefined, importBatch.id);

    // Calculate trades after successful import
    if (successCount > 0) {
      try {
        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);
      } catch (error) {
        console.error('Trade calculation error:', error);
        // Don't fail the import if trade calculation fails
      }
    }

    return {
      success: errorCount < records.length,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      errors,
      aiMappingResult: mappingResult,
      requiresUserReview: false,
    };
  }

  private async createUploadLog(
    userId: string, 
    filename: string, 
    headers: string[], 
    rowCount: number
  ) {
    return await prisma.csvUploadLog.create({
      data: {
        userId,
        filename,
        originalHeaders: headers,
        rowCount,
        uploadStatus: 'UPLOADED',
        parseMethod: 'STANDARD', // Will be updated based on actual processing
      },
    });
  }

  private async updateUploadLog(
    logId: string, 
    status: string, 
    parseMethod?: string, 
    errorMessage?: string,
    importBatchId?: string
  ) {
    const updateData: Record<string, unknown> = { uploadStatus: status };
    
    if (parseMethod) updateData.parseMethod = parseMethod;
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (importBatchId) updateData.importBatchId = importBatchId;

    return await prisma.csvUploadLog.update({
      where: { id: logId },
      data: updateData,
    });
  }

  async getImportStatus(importBatchId: string, userId: string) {
    const importBatch = await prisma.importBatch.findFirst({
      where: { 
        id: importBatchId,
        userId 
      },
      include: {
        csvUploadLogs: true,
      },
    });

    if (!importBatch) {
      throw new Error('Import batch not found');
    }

    return {
      id: importBatch.id,
      filename: importBatch.filename,
      status: importBatch.status,
      importType: importBatch.importType,
      totalRecords: importBatch.totalRecords,
      successCount: importBatch.successCount,
      errorCount: importBatch.errorCount,
      errors: importBatch.errors,
      aiMappingUsed: importBatch.aiMappingUsed,
      mappingConfidence: importBatch.mappingConfidence,
      columnMappings: importBatch.columnMappings,
      userReviewRequired: importBatch.userReviewRequired,
      processingStarted: importBatch.processingStarted,
      processingCompleted: importBatch.processingCompleted,
      createdAt: importBatch.createdAt,
    };
  }

  async retryImportWithUserMappings(
    importBatchId: string,
    userId: string,
    _userMappings: ColumnMapping[],
  ): Promise<CsvIngestionResult> {
    // Get the original import batch
    const importBatch = await prisma.importBatch.findFirst({
      where: { 
        id: importBatchId,
        userId,
        status: 'PENDING' 
      },
    });

    if (!importBatch) {
      throw new Error('Import batch not found or not in pending state');
    }

    // Note: In a real implementation, you'd need to store the original file content
    // For now, we'll throw an error indicating this limitation
    throw new Error('Retry with user mappings requires storing original file content - not implemented in this demo');
  }

  private getBrokerTypeFromFormat(format: CsvFormat): BrokerType {
    const brokerMap: { [key: string]: BrokerType } = {
      'interactive-brokers-flex': BrokerType.INTERACTIVE_BROKERS,
      'td-ameritrade-history': BrokerType.TD_AMERITRADE,
      'etrade-transactions': BrokerType.E_TRADE,
      'fidelity-positions': BrokerType.FIDELITY,
      'robinhood-statements': BrokerType.ROBINHOOD,
      'custom-order-execution': BrokerType.GENERIC_CSV,
      'trade-voyager-orders': BrokerType.GENERIC_CSV,
      'schwab-todays-trades': BrokerType.CHARLES_SCHWAB,
      'schwab-trade-execution': BrokerType.CHARLES_SCHWAB,  // Added missing mapping!
    };
    
    return brokerMap[format.id] || BrokerType.GENERIC_CSV;
  }

  private applyDetectedFormatMapping(row: Record<string, unknown>, format: CsvFormat, accountTags: string[]): NormalizedOrder {
    const normalizedData: Record<string, unknown> = {};
    const mappedFields = new Set<string>(); // Track which target fields have been mapped
    const skippedMappings: string[] = []; // Track skipped mappings for logging
    
    // Apply mappings from detected format with first-match-wins logic
    const fieldMappings = format.fieldMappings;
    for (const csvColumn of Object.keys(fieldMappings)) {
      const mapping = fieldMappings[csvColumn];
      const value = row[csvColumn];
      
      // Check if target field already mapped (first-match-wins)
      if (mappedFields.has(mapping.tradeVoyagerField)) {
        skippedMappings.push(`${csvColumn} -> ${mapping.tradeVoyagerField} (already mapped)`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        let transformedValue = value;
        
        // Apply data transformers if specified
        if (mapping.transformer && DATA_TRANSFORMERS[mapping.transformer as keyof typeof DATA_TRANSFORMERS]) {
          try {
            transformedValue = DATA_TRANSFORMERS[mapping.transformer as keyof typeof DATA_TRANSFORMERS](String(value)) || value;
          } catch (error) {
            console.warn(`Transformer ${mapping.transformer} failed for value ${value}:`, error);
            transformedValue = value;
          }
        }
        
        // Type conversion
        switch (mapping.dataType) {
          case 'number':
            const numStr = String(transformedValue).replace(/[$,]/g, '');
            const parsedNum = parseFloat(numStr);
            if (isNaN(parsedNum)) {
              console.warn(`Failed to parse number from: ${value}`);
              continue; // Skip invalid numbers
            }
            transformedValue = parsedNum;
            break;
          case 'date':
            if (transformedValue instanceof Date) {
              // Already a date from transformer
            } else {
              const parsedDate = new Date(String(transformedValue));
              if (isNaN(parsedDate.getTime())) {
                console.warn(`Failed to parse date from: ${value}`);
                continue; // Skip invalid dates
              }
              transformedValue = parsedDate;
            }
            break;
          case 'boolean':
            transformedValue = Boolean(transformedValue);
            break;
          default:
            transformedValue = String(transformedValue);
        }
        
        // Special handling for brokerMetadata - accumulate multiple values
        if (mapping.tradeVoyagerField === 'brokerMetadata') {
          if (!normalizedData.brokerMetadata) {
            normalizedData.brokerMetadata = {};
          }
          (normalizedData.brokerMetadata as Record<string, unknown>)[csvColumn] = transformedValue;
        } else {
          normalizedData[mapping.tradeVoyagerField] = transformedValue;
          mappedFields.add(mapping.tradeVoyagerField);
        }
      }
    }
    
    // Log skipped mappings for debugging
    if (skippedMappings.length > 0) {
      console.log(`First-match-wins: Skipped ${skippedMappings.length} duplicate mappings:`, skippedMappings);
    }
    
    // Handle tags field (convert string to array)
    if (normalizedData.tags && typeof normalizedData.tags === 'string') {
      normalizedData.tags = [normalizedData.tags, ...accountTags];
    } else {
      normalizedData.tags = accountTags;
    }

    // Ensure required fields have defaults for orders
    const order: NormalizedOrder = {
      orderId: String(normalizedData.orderId || ''),
      parentOrderId: normalizedData.parentOrderId ? String(normalizedData.parentOrderId) : null,
      symbol: String(normalizedData.symbol || ''),
      orderType: String(normalizedData.orderType || 'MARKET'),
      side: this.normalizeOrderSide(String(normalizedData.side) || 'BUY'),
      timeInForce: 'DAY',
      orderQuantity: Number(normalizedData.orderQuantity) || 0,
      limitPrice: normalizedData.limitPrice ? Number(normalizedData.limitPrice) : null,
      stopPrice: normalizedData.stopPrice ? Number(normalizedData.stopPrice) : null,
      orderStatus: 'FILLED',
      orderPlacedTime: normalizedData.orderExecutedTime ? new Date(String(normalizedData.orderExecutedTime)) : new Date(),
      orderExecutedTime: normalizedData.orderExecutedTime ? new Date(String(normalizedData.orderExecutedTime)) : new Date(),
      accountId: normalizedData.accountId ? String(normalizedData.accountId) : null,
      orderAccount: normalizedData.orderAccount ? String(normalizedData.orderAccount) : null,
      orderRoute: normalizedData.orderRoute ? String(normalizedData.orderRoute) : null,
      tags: Array.isArray(normalizedData.tags) ? normalizedData.tags as string[] : accountTags,
    };
    
    return order;
  }
  
  private normalizeOrderSide(side: string): 'BUY' | 'SELL' {
    const sideUpper = String(side).toUpperCase();
    const sideMap: { [key: string]: 'BUY' | 'SELL' } = {
      'BUY': 'BUY',
      'BOT': 'BUY',
      'B': 'BUY',
      'BOUGHT': 'BUY',
      'YOU BOUGHT': 'BUY',
      'SELL': 'SELL',
      'SLD': 'SELL',
      'S': 'SELL',
      'SOLD': 'SELL',
      'YOU SOLD': 'SELL',
    };
    
    return sideMap[sideUpper] || 'BUY';
  }

  private normalizeSide(side: string): 'BUY' | 'SELL' | 'SHORT' | 'COVER' {
    const sideUpper = String(side).toUpperCase();
    const sideMap: { [key: string]: 'BUY' | 'SELL' | 'SHORT' | 'COVER' } = {
      'BUY': 'BUY',
      'BOT': 'BUY',
      'B': 'BUY',
      'BOUGHT': 'BUY',
      'YOU BOUGHT': 'BUY',
      'SELL': 'SELL',
      'SLD': 'SELL',
      'S': 'SELL',
      'SOLD': 'SELL',
      'YOU SOLD': 'SELL',
      'SHORT': 'SHORT',
      'COVER': 'COVER',
    };
    
    return sideMap[sideUpper] || 'BUY';
  }

  private async processSchwabCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number
  ): Promise<CsvIngestionResult> {
    
    // Parse Schwab format using our custom parser
    const { parseSchwabTodaysTrades } = await import('../../scripts/parseSchwabTodaysTrades');
    const schwabResult = parseSchwabTodaysTrades(fileContent);
    
    const totalTrades = schwabResult.workingOrders.length + 
                       schwabResult.filledOrders.length + 
                       schwabResult.cancelledOrders.length;

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: 'CHARLES_SCHWAB',
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: totalTrades,
        aiMappingUsed: false,
        mappingConfidence: 1.0, // Custom parser is 100% confident
        userReviewRequired: false,
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'USER_CORRECTED', undefined, importBatch.id);

    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process filled orders as orders (they're actually executions)
    const filledOrders = (schwabResult as SchwabParseResult).filledOrders;
    for (let index = 0; index < filledOrders.length; index++) {
      const order = filledOrders[index];
      try {
        await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: `schwab-${Date.now()}-${index}`,
            symbol: order.symbol || '',
            orderType: this.normalizeOrderType(order.orderType || 'Market'),
            side: this.normalizeOrderSide(order.side || 'BUY'),
            timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
            orderQuantity: order.orderQuantity || 0,
            limitPrice: order.limitPrice,
            orderStatus: this.normalizeOrderStatus(order.orderStatus || 'FILLED'),
            orderPlacedTime: order.orderExecutedTime || new Date(),
            orderExecutedTime: order.orderExecutedTime || new Date(),
            brokerType: BrokerType.CHARLES_SCHWAB,
            tags: accountTags,
          },
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Filled order ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process working orders
    const workingOrders = (schwabResult as SchwabParseResult).workingOrders;
    for (let index = 0; index < workingOrders.length; index++) {
      const order = workingOrders[index];
      try {
        await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: `schwab-working-${Date.now()}-${index}`,
            symbol: order.symbol || '',
            orderType: this.normalizeOrderType(order.orderType || 'Market'),
            side: this.normalizeOrderSide(order.side || 'BUY'),
            timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
            orderQuantity: order.orderQuantity || 0,
            limitPrice: order.limitPrice,
            orderStatus: this.normalizeOrderStatus('WORKING'), // Working orders are PENDING
            orderPlacedTime: order.orderPlacedTime || new Date(),
            brokerType: BrokerType.CHARLES_SCHWAB,
            tags: accountTags,
          },
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Working order ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process cancelled orders
    const cancelledOrders = (schwabResult as SchwabParseResult).cancelledOrders;
    for (let index = 0; index < cancelledOrders.length; index++) {
      const order = cancelledOrders[index];
      try {
        if (order.symbol) { // Only process orders with symbols
          await prisma.order.create({
            data: {
              userId,
              importBatchId: importBatch.id,
              orderId: `schwab-cancelled-${Date.now()}-${index}`,
              symbol: order.symbol,
              orderType: this.normalizeOrderType(order.orderType || 'Market'),
              side: this.normalizeOrderSide(order.side || 'BUY'),
              timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
              orderQuantity: order.orderQuantity || 0,
              limitPrice: order.limitPrice,
              orderStatus: this.normalizeOrderStatus(order.orderStatus || 'CANCELLED'),
              orderPlacedTime: order.orderCancelledTime || new Date(),
              orderCancelledTime: order.orderCancelledTime || new Date(),
              brokerType: BrokerType.CHARLES_SCHWAB,
              tags: accountTags,
            },
          });

          successCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push(`Cancelled order ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add parsing errors if any
    if ((schwabResult as SchwabParseResult).errors.length > 0) {
      errors.push(...(schwabResult as SchwabParseResult).errors);
      errorCount += (schwabResult as SchwabParseResult).errors.length;
    }

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === totalTrades ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'USER_CORRECTED');

    return {
      success: errorCount < totalTrades,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: totalTrades,
      successCount,
      errorCount,
      errors,
      requiresUserReview: false,
    };
  }

  private normalizeOrderType(orderType: string): 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'MARKET_ON_CLOSE' | 'LIMIT_ON_CLOSE' | 'PEGGED_TO_MIDPOINT' {
    const typeMap: { [key: string]: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'MARKET_ON_CLOSE' | 'LIMIT_ON_CLOSE' | 'PEGGED_TO_MIDPOINT' } = {
      'Market': 'MARKET',
      'Limit': 'LIMIT', 
      'Stop': 'STOP',
      'MARKET': 'MARKET',
      'LIMIT': 'LIMIT',
      'STOP': 'STOP',
      'MKT': 'MARKET',
      'LMT': 'LIMIT',
      'STP': 'STOP'
    };
    return typeMap[orderType] || 'MARKET';
  }

  private normalizeTimeInForce(timeInForce: string): 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'GTD' {
    const tifMap: { [key: string]: 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'GTD' } = {
      'DAY': 'DAY',
      'GTC': 'GTC',
      'IOC': 'IOC', 
      'FOK': 'FOK',
      'GTD': 'GTD'
    };
    return tifMap[timeInForce] || 'DAY';
  }

  private normalizeOrderStatus(orderStatus: string): 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED' {
    const statusMap: { [key: string]: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED' } = {
      'WORKING': 'PENDING',
      'FILLED': 'FILLED',
      'CANCELLED': 'CANCELLED',
      'CANCELED': 'CANCELLED',
      'REJECTED': 'REJECTED',
      'EXPIRED': 'EXPIRED',
      'PENDING': 'PENDING',
      'PARTIALLY_FILLED': 'PARTIALLY_FILLED'
    };
    return statusMap[orderStatus] || 'PENDING';
  }
}