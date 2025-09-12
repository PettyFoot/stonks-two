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
import { BrokerFormatService, type FormatDetectionResult } from '@/lib/brokerFormatService';
import { OpenAiMappingService, type OpenAiMappingResult } from '@/lib/ai/openAiMappingService';
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
  openAiMappingResult?: OpenAiMappingResult;
  requiresUserReview: boolean;
  requiresBrokerSelection: boolean;
  backgroundJobId?: string;
  brokerFormatUsed?: string; // Name of broker format that was used
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
  brokerDetection?: FormatDetectionResult;
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
  private brokerFormatService: BrokerFormatService;
  private openAiService: OpenAiMappingService;

  constructor() {
    // Initialize AI mapper with API key from environment
    const aiApiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.aiMapper = new CsvAiMapper(aiApiKey);
    this.formatDetector = new CsvFormatDetector();
    this.brokerFormatService = new BrokerFormatService();
    this.openAiService = new OpenAiMappingService();
  }

  /**
   * Helper method to determine appropriate orderExecutedTime based on whether we have a specific execution time mapping
   */
  private getOrderExecutedTime(mappedData: Record<string, unknown>, mappings?: Record<string, any> | ColumnMapping[]): Date {
    // If we have a specific orderExecutedTime from mapping, use it
    if (mappedData.orderExecutedTime) {
      return new Date(String(mappedData.orderExecutedTime));
    }

    // Check if any of the original headers contained execution-specific terms
    let hasExecutionTimeMapping = false;
    if (mappings) {
      if (Array.isArray(mappings)) {
        // ColumnMapping[] format
        hasExecutionTimeMapping = mappings.some((mapping: any) => 
          mapping.tradeVoyagerField === 'orderExecutedTime' && this.isExecutionSpecificHeader(mapping.csvColumn)
        );
      } else {
        // Record<string, mapping> format (OpenAI mappings)
        hasExecutionTimeMapping = Object.entries(mappings).some(([csvHeader, mapping]) => 
          mapping.field === 'orderExecutedTime' && this.isExecutionSpecificHeader(csvHeader)
        );
      }
    }

    // If we don't have execution-specific mapping, use orderPlacedTime for orderExecutedTime
    if (!hasExecutionTimeMapping && mappedData.orderPlacedTime) {
      return new Date(String(mappedData.orderPlacedTime));
    }

    // Fallback to current time if no placed time either
    return mappedData.orderPlacedTime ? new Date(String(mappedData.orderPlacedTime)) : new Date();
  }

  /**
   * Check if a header name contains execution-specific terms
   */
  private isExecutionSpecificHeader(headerName: string): boolean {
    const header = headerName.toLowerCase();
    const executionTerms = ['exec', 'execution', 'fill', 'filled', 'trade'];
    const timeTerms = ['time', 'date'];
    
    return executionTerms.some(execTerm => header.includes(execTerm)) && 
           timeTerms.some(timeTerm => header.includes(timeTerm));
  }

  /**
   * Check for duplicate orders before creating a new one
   */
  private async isDuplicateOrder(
    userId: string,
    importBatchId: string,
    symbol: string,
    orderQuantity: number,
    orderExecutedTime: Date,
    brokerType: string
  ): Promise<boolean> {
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        importBatchId,
        symbol,
        orderQuantity,
        orderExecutedTime,
        brokerType: brokerType as BrokerType,
      }
    });

    return !!existingOrder;
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

  /**
   * Enhanced validation that includes broker format detection
   */
  async validateCsvFileWithBrokerDetection(fileContent: string): Promise<CsvValidationResult & {
    brokerDetection?: FormatDetectionResult;
    requiresBrokerSelection?: boolean;
  }> {
    const baseValidation = await this.validateCsvFile(fileContent);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Try to detect broker format from database
    const brokerDetection = await this.brokerFormatService.detectFormat(baseValidation.headers);
    
    const result = {
      ...baseValidation,
      brokerDetection,
      requiresBrokerSelection: !brokerDetection.isExactMatch && brokerDetection.confidence < 0.8
    };

    return result;
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
        
        // Also try broker format detection from database
        const brokerDetection = await this.brokerFormatService.detectFormat(headers);
        
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
          brokerDetection,
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
      
      // Also try broker format detection from database
      const brokerDetection = await this.brokerFormatService.detectFormat(headers);
      
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
        brokerDetection,
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
    userMappings?: ColumnMapping[],
    brokerName?: string
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
      // Check for Schwab Today's Trade Activity format first (special case)
      const schwabPattern = /Today's Trade Activity for \d+\w*\s+.*on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i;
      const isSchwabFormat = schwabPattern.test(fileContent);
      
      // Try to detect broker format from database
      const brokerDetection = await this.brokerFormatService.detectFormat(validation.headers);
      
      console.log('=== Enhanced CSV Processing Debug ===');
      console.log('Is standard format:', validation.isStandardFormat);
      console.log('Is Schwab Today\'s format:', isSchwabFormat);
      console.log('Broker detection result:', {
        broker: brokerDetection.broker?.name,
        format: brokerDetection.format?.formatName,
        confidence: brokerDetection.confidence,
        isExactMatch: brokerDetection.isExactMatch
      });
      console.log('User provided broker name:', brokerName);
      console.log('Has user mappings:', !!userMappings);
      
      // Decision tree for processing method
      if (isSchwabFormat && !userMappings) {
        console.log('→ Using processSchwabCsv (special Schwab format)');
        return await this.processSchwabCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize
        );
      } else if (validation.isStandardFormat && !userMappings) {
        console.log('→ Using processStandardCsv');
        return await this.processStandardCsv(
          fileContent, 
          fileName, 
          userId, 
          accountTags, 
          uploadLog.id,
          validation.fileSize
        );
      } else if (brokerDetection.isExactMatch && brokerDetection.confidence >= 0.8 && !userMappings) {
        console.log('→ Using known broker format from database');
        return await this.processKnownBrokerFormat(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize,
          brokerDetection
        );
      } else if (brokerDetection.confidence >= 0.6 && !userMappings) {
        console.log('→ Using similar broker format from database');
        return await this.processKnownBrokerFormat(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize,
          brokerDetection
        );
      } else if (validation.detectedFormat && validation.formatConfidence && validation.formatConfidence >= 0.7 && !userMappings) {
        console.log('→ Using legacy processDetectedFormatCsv');
        return await this.processDetectedFormatCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize,
          validation.detectedFormat
        );
      } else if (brokerName && !userMappings) {
        console.log('→ Using processOpenAiCsv with broker name');
        return await this.processOpenAiCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize,
          brokerName
        );
      } else if (!brokerName && !userMappings) {
        console.log('→ Using processOpenAiCsv without broker name (will require broker selection)');
        return await this.processOpenAiCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize
        );
      } else {
        console.log('→ Using legacy processCustomCsv with user mappings');
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

  /**
   * Process CSV using a known broker format from database
   */
  private async processKnownBrokerFormat(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number,
    brokerDetection: FormatDetectionResult
  ): Promise<CsvIngestionResult> {
    
    if (!brokerDetection.broker || !brokerDetection.format) {
      throw new Error('Invalid broker detection result');
    }

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
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: this.getBrokerTypeFromName(brokerDetection.broker.name),
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: false,
        mappingConfidence: brokerDetection.confidence,
        columnMappings: brokerDetection.format.fieldMappings as any,
        userReviewRequired: false,
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'STANDARD', undefined, importBatch.id);

    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Extract mappings from the stored format
    const fieldMappings = brokerDetection.format.fieldMappings as Record<string, any>;

    // Process each row using stored broker format mappings
    for (let i = 0; i < records.length; i++) {
      try {
        const mappedData: Record<string, unknown> = {};
        const brokerMetadata: Record<string, unknown> = {};

        // Apply stored mappings
        for (const [csvHeader, mapping] of Object.entries(fieldMappings)) {
          const value = (records[i] as Record<string, unknown>)[csvHeader];
          
          if (value !== undefined && value !== null && value !== '') {
            if (mapping.field === 'brokerMetadata' || mapping.confidence < 0.5) {
              brokerMetadata[csvHeader] = value;
            } else {
              mappedData[mapping.field] = value;
            }
          }
        }

        // Calculate times using helper method
        const orderPlacedTime = mappedData.orderPlacedTime ? new Date(String(mappedData.orderPlacedTime)) : new Date();
        const orderExecutedTime = this.getOrderExecutedTime(mappedData, brokerDetection.format.fieldMappings as Record<string, any>);
        const symbol = String(mappedData.symbol || '');
        const orderQuantity = Number(mappedData.orderQuantity) || 0;
        const brokerType = this.getBrokerTypeFromName(brokerDetection.broker.name);

        // Check for duplicate
        if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerType)) {
          console.log(`Skipping duplicate order: ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}`);
          continue; // Skip this duplicate order
        }

        // Create order record
        await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: String(mappedData.orderId || `known-${Date.now()}-${i}`),
            parentOrderId: mappedData.parentOrderId ? String(mappedData.parentOrderId) : null,
            symbol,
            orderType: this.normalizeOrderType(String(mappedData.orderType || 'MARKET')),
            side: this.normalizeOrderSide(String(mappedData.side || 'BUY')),
            timeInForce: this.normalizeTimeInForce(String(mappedData.timeInForce || 'DAY')),
            orderQuantity,
            limitPrice: mappedData.limitPrice ? Number(mappedData.limitPrice) : null,
            stopPrice: mappedData.stopPrice ? Number(mappedData.stopPrice) : null,
            orderStatus: this.normalizeOrderStatus(String(mappedData.orderStatus || 'FILLED')),
            orderPlacedTime,
            orderExecutedTime,
            accountId: mappedData.accountId ? String(mappedData.accountId) : null,
            orderAccount: mappedData.orderAccount ? String(mappedData.orderAccount) : null,
            orderRoute: mappedData.orderRoute ? String(mappedData.orderRoute) : null,
            brokerType,
            brokerMetadata: Object.keys(brokerMetadata).length > 0 ? brokerMetadata as any : null,
            tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
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

    // Update format usage statistics
    await this.brokerFormatService.updateFormatUsage(brokerDetection.format.id, successCount > 0);

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
      requiresBrokerSelection: false,
      brokerFormatUsed: brokerDetection.format.formatName,
    };
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
      requiresBrokerSelection: false,
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

        // Check for duplicate
        if (await this.isDuplicateOrder(userId, importBatch.id, normalizedOrder.symbol, normalizedOrder.orderQuantity, normalizedOrder.orderExecutedTime, orderBrokerType)) {
          console.log(`Skipping duplicate order: ${normalizedOrder.symbol} ${normalizedOrder.orderQuantity} shares at ${normalizedOrder.orderExecutedTime.toISOString()}`);
          continue; // Skip this duplicate order
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
      requiresBrokerSelection: false,
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
        userReviewRequired: true, // Always require review for AI-generated mappings
      },
    });

    // Create AiIngestToCheck record if using AI mapping (not user mappings)
    let aiIngestCheck: any = null;
    if (!userMappings) {
      // Create or find broker CSV format for this new mapping
      let brokerCsvFormat = await prisma.brokerCsvFormat.findFirst({
        where: {
          brokerName: 'Generic',
          formatName: `Generic_AI_${Date.now()}`,
        }
      });

      if (!brokerCsvFormat) {
        brokerCsvFormat = await prisma.brokerCsvFormat.create({
          data: {
            brokerName: 'Generic',
            formatName: `Generic_AI_${Date.now()}`,
            description: `AI-generated mapping for ${fileName}`,
            sampleHeaders: headers,
            fieldMappings: mappingResult.mappings as unknown as Prisma.InputJsonValue,
            confidence: mappingResult.overallConfidence,
            isActive: false, // Don't make active until user approves
          }
        });
      }

      // Create AiIngestToCheck record for user review tracking
      aiIngestCheck = await prisma.aiIngestToCheck.create({
        data: {
          userId,
          brokerCsvFormatId: brokerCsvFormat.id,
          csvUploadLogId: uploadLogId,
          importBatchId: importBatch.id,
          processingStatus: 'PENDING',
          userIndicatedError: false,
        }
      });
    }

    // Always require user review for AI-generated mappings to collect feedback
    // and ensure data accuracy
    if (true) { // Always require review for AI mappings
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
        requiresBrokerSelection: false,
        aiIngestCheckId: aiIngestCheck?.id, // Include for frontend reference
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
            
            // Calculate times using helper method
            const orderPlacedTime = mappedData.orderPlacedTime ? new Date(String(mappedData.orderPlacedTime)) : new Date();
            const orderExecutedTime = this.getOrderExecutedTime(mappedData, mappingResult.mappings);
            const symbol = String(mappedData.symbol || '');
            const orderQuantity = Number(mappedData.orderQuantity) || 0;

            // Check for duplicate
            if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerType)) {
              console.log(`Skipping duplicate order: ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}`);
              continue; // Skip this duplicate order
            }

            // Create order record
            await prisma.order.create({
              data: {
                userId,
                importBatchId: importBatch.id,
                orderId: String(mappedData.orderId || `auto-${Date.now()}-${index}`),
                parentOrderId: mappedData.parentOrderId ? String(mappedData.parentOrderId) : null,
                symbol,
                orderType: this.normalizeOrderType(String(mappedData.orderType || 'MARKET')),
                side: this.normalizeOrderSide(String(mappedData.side || 'BUY')),
                timeInForce: this.normalizeTimeInForce(String(mappedData.timeInForce || 'DAY')),
                orderQuantity,
                limitPrice: mappedData.limitPrice ? Number(mappedData.limitPrice) : null,
                stopPrice: mappedData.stopPrice ? Number(mappedData.stopPrice) : null,
                orderStatus: this.normalizeOrderStatus(String(mappedData.orderStatus || 'FILLED')),
                orderPlacedTime,
                orderExecutedTime,
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
      requiresBrokerSelection: false,
    };
  }

  /**
   * Process CSV with OpenAI analysis when no known format is detected
   */
  async processOpenAiCsv(
    fileContent: string,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number,
    brokerName?: string
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
    const sampleData = records.slice(0, 5) as Record<string, unknown>[];

    // If no broker name provided, require user to select one
    if (!brokerName) {
      console.log('🔍 No broker name provided, storing file content for later processing');
      console.log(`📊 File contains ${records.length} records with ${headers.length} columns`);
      console.log('📋 Headers:', headers);
      
      // Create a temporary import batch for later processing
      const importBatch = await prisma.importBatch.create({
        data: {
          userId,
          filename: fileName,
          fileSize,
          brokerType: BrokerType.GENERIC_CSV,
          importType: 'CUSTOM',
          status: 'PENDING',
          totalRecords: records.length,
          aiMappingUsed: false,
          userReviewRequired: true,
          tempFileContent: fileContent, // Store the file content for later processing
        },
      });

      console.log(`✅ Created pending import batch: ${importBatch.id}`);
      console.log('⏸️ Waiting for user to select broker...');

      return {
        success: false,
        importBatchId: importBatch.id,
        importType: 'CUSTOM',
        totalRecords: records.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        requiresUserReview: true,
        requiresBrokerSelection: true,
      };
    }

    console.log(`🤖 Processing CSV with OpenAI for broker: ${brokerName}`);
    console.log('📊 Sending headers to OpenAI:', headers);
    console.log('🔬 Sample data rows:', sampleData.length);
    
    // Generate AI mappings WITHOUT creating broker format yet
    // The format will be created later after user approval
    const aiResult = await this.openAiService.analyzeHeaders({
      csvHeaders: headers,
      sampleData,
      brokerName: brokerName
    });
    
    console.log('✨ OpenAI mapping completed!');
    console.log(`📊 Confidence score: ${(aiResult.overallConfidence * 100).toFixed(1)}%`);
    console.log('🔍 Mapped fields:', Object.keys(aiResult.mappings).length);
    console.log('❓ Unmapped fields:', aiResult.brokerMetadataFields.length);
    console.log('⏸️ Broker format NOT created yet - waiting for user approval');

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: this.getBrokerTypeFromName(brokerName),
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: true,
        mappingConfidence: aiResult.overallConfidence,
        columnMappings: aiResult.mappings as unknown as Prisma.InputJsonValue,
        userReviewRequired: true, // Always require review for AI-generated mappings
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'MAPPED', 'AI_MAPPED', undefined, importBatch.id);

    // Store the pending AI result in import batch for later processing
    // Don't create AiIngestToCheck yet since we don't have a broker format ID yet
    // Using columnMappings temporarily until we can add the new columns
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        columnMappings: {
          pendingAiMappings: aiResult.mappings,
          pendingBrokerName: brokerName,
          pendingMetadata: aiResult.brokerMetadataFields,
          overallConfidence: aiResult.overallConfidence
        } as any,
        tempFileContent: fileContent, // Store file content for later processing
      },
    });

    // Always require user review for AI-generated mappings to ensure accuracy
    // and collect feedback for improving the AI model
    if (true) { // Always require review for AI mappings
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
        openAiMappingResult: aiResult,
        requiresUserReview: true,
        requiresBrokerSelection: false,
        brokerFormatUsed: brokerName || 'AI_Generated',
        // aiIngestCheckId will be created after user approves the mappings
      };
    }

    // Process with OpenAI mappings
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [index, row] of records.entries()) {
        try {
          const mappedData: Record<string, unknown> = {};
          const brokerMetadata: Record<string, unknown> = {};

          // Apply OpenAI mappings
          for (const [csvHeader, mapping] of Object.entries(aiResult.mappings)) {
            const value = (row as Record<string, unknown>)[csvHeader];
            
            if (value !== undefined && value !== null && value !== '') {
              if (mapping.field === 'brokerMetadata') {
                brokerMetadata[csvHeader] = value;
              } else {
                mappedData[mapping.field] = value;
              }
            }
          }

          // Store unmapped fields in brokerMetadata
          for (const field of aiResult.brokerMetadataFields) {
            const value = (row as Record<string, unknown>)[field];
            if (value !== undefined && value !== null && value !== '') {
              brokerMetadata[field] = value;
            }
          }

          // Calculate times using helper method
          const orderPlacedTime = mappedData.orderPlacedTime ? new Date(String(mappedData.orderPlacedTime)) : new Date();
          const orderExecutedTime = this.getOrderExecutedTime(mappedData, aiResult.mappings);
          const symbol = String(mappedData.symbol || '');
          const orderQuantity = Number(mappedData.orderQuantity) || 0;
          const brokerType = this.getBrokerTypeFromName(brokerName);

          // Check for duplicate
          if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerType)) {
            console.log(`Skipping duplicate order: ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}`);
            continue; // Skip this duplicate order
          }

          // Create order record
          await prisma.order.create({
            data: {
              userId,
              importBatchId: importBatch.id,
              orderId: String(mappedData.orderId || `ai-${Date.now()}-${index}`),
              parentOrderId: mappedData.parentOrderId ? String(mappedData.parentOrderId) : null,
              symbol,
              orderType: this.normalizeOrderType(String(mappedData.orderType || 'MARKET')),
              side: this.normalizeOrderSide(String(mappedData.side || 'BUY')),
              timeInForce: this.normalizeTimeInForce(String(mappedData.timeInForce || 'DAY')),
              orderQuantity,
              limitPrice: mappedData.limitPrice ? Number(mappedData.limitPrice) : null,
              stopPrice: mappedData.stopPrice ? Number(mappedData.stopPrice) : null,
              orderStatus: this.normalizeOrderStatus(String(mappedData.orderStatus || 'FILLED')),
              orderPlacedTime,
              orderExecutedTime,
              accountId: mappedData.accountId ? String(mappedData.accountId) : null,
              orderAccount: mappedData.orderAccount ? String(mappedData.orderAccount) : null,
              orderRoute: mappedData.orderRoute ? String(mappedData.orderRoute) : null,
              brokerType,
              brokerMetadata: Object.keys(brokerMetadata).length > 0 ? brokerMetadata as any : null,
              tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
            },
          });
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`OpenAI mapping application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Format usage statistics will be updated when the format is actually created
    // after user approval in the finalize-mappings endpoint

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'AI_MAPPED', undefined, importBatch.id);

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
      openAiMappingResult: aiResult,
      requiresUserReview: false,
      requiresBrokerSelection: false,
      brokerFormatUsed: brokerName || 'AI_Generated',
    };
  }

  /**
   * Convert broker name to BrokerType enum
   */
  private getBrokerTypeFromName(brokerName: string): BrokerType {
    const normalized = brokerName.toLowerCase();
    
    if (normalized.includes('interactive') || normalized.includes('ibkr')) {
      return BrokerType.INTERACTIVE_BROKERS;
    } else if (normalized.includes('schwab') || normalized.includes('charles')) {
      return BrokerType.CHARLES_SCHWAB;
    } else if (normalized.includes('ameritrade') || normalized.includes('thinkorswim') || normalized.includes('tos')) {
      return BrokerType.TD_AMERITRADE;
    } else if (normalized.includes('etrade') || normalized.includes('e*trade')) {
      return BrokerType.E_TRADE;
    } else if (normalized.includes('fidelity')) {
      return BrokerType.FIDELITY;
    } else if (normalized.includes('robinhood')) {
      return BrokerType.ROBINHOOD;
    } else {
      return BrokerType.GENERIC_CSV;
    }
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

    // Calculate proper times - if we have both placed and executed, use them; otherwise use placed for both
    let orderPlacedTime: Date;
    let orderExecutedTime: Date;
    
    if (normalizedData.orderPlacedTime && normalizedData.orderExecutedTime) {
      // We have both times explicitly
      orderPlacedTime = new Date(String(normalizedData.orderPlacedTime));
      orderExecutedTime = new Date(String(normalizedData.orderExecutedTime));
    } else if (normalizedData.orderPlacedTime) {
      // Only have placed time - use it for both
      orderPlacedTime = new Date(String(normalizedData.orderPlacedTime));
      orderExecutedTime = orderPlacedTime;
    } else if (normalizedData.orderExecutedTime) {
      // Only have executed time - check if it's from an execution-specific mapping
      const hasExecutionMapping = Object.entries(format.fieldMappings).some(([csvHeader, mapping]) => 
        mapping.tradeVoyagerField === 'orderExecutedTime' && this.isExecutionSpecificHeader(csvHeader)
      );
      
      if (hasExecutionMapping) {
        // It's a true execution time, use current time for placed
        orderExecutedTime = new Date(String(normalizedData.orderExecutedTime));
        orderPlacedTime = orderExecutedTime; // Assume they're the same unless we have both
      } else {
        // It's probably a general time, use it for both
        const time = new Date(String(normalizedData.orderExecutedTime));
        orderPlacedTime = time;
        orderExecutedTime = time;
      }
    } else {
      // No time data, use current time
      const currentTime = new Date();
      orderPlacedTime = currentTime;
      orderExecutedTime = currentTime;
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
      orderPlacedTime,
      orderExecutedTime,
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
      requiresBrokerSelection: false,
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