import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { 
  StandardCsvRowSchema, 
  normalizeStandardCsvRow, 
  STANDARD_CSV_COLUMNS,
  REQUIRED_COLUMNS,
  type NormalizedTrade 
} from '@/lib/schemas/standardCsv';
import { 
  CsvAiMapper, 
  type AiMappingResult, 
  type ColumnMapping,
  CONFIDENCE_THRESHOLDS 
} from '@/lib/ai/csvMapper';
import { 
  CsvFormatDetector, 
  type CsvFormat, 
  DATA_TRANSFORMERS 
} from '@/lib/csvFormatRegistry';

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
  sampleRows: any[];
  rowCount: number;
  errors: string[];
  fileSize: number;
  detectedFormat?: CsvFormat;
  formatConfidence?: number;
  formatReasoning?: string[];
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

  async validateCsvFile(fileContent: string, fileName: string): Promise<CsvValidationResult> {
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
          detectedFormat: formatDetection.format,
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

      const headers = Object.keys(records[0]);
      const sampleRows = records.slice(0, 5); // Get first 5 rows for analysis
      
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
        detectedFormat: formatDetection.format,
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
    const validation = await this.validateCsvFile(fileContent, fileName);
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
            time: normalizedTrade.time,
            symbol: normalizedTrade.symbol,
            side: normalizedTrade.side,
            volume: normalizedTrade.volume,
            executions: 1,
            pnl: normalizedTrade.pnl,
            price: normalizedTrade.price,
            commission: normalizedTrade.commission,
            fees: normalizedTrade.fees,
            account: normalizedTrade.account,
            notes: normalizedTrade.notes,
            tags: normalizedTrade.tags,
            // Required fields for enhanced schema
            orderFilledTime: normalizedTrade.date,
            entryDate: normalizedTrade.date,
            quantityFilled: normalizedTrade.volume,
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
        errors: errors.length > 0 ? errors : null,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

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
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: this.getBrokerTypeFromFormat(detectedFormat),
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
        const normalizedOrder = this.applyDetectedFormatMapping(records[i], detectedFormat, accountTags);
        
        // Create order record
        await prisma.order.create({
          data: {
            userId,
            orderId: normalizedOrder.orderId,
            parentOrderId: normalizedOrder.parentOrderId,
            symbol: normalizedOrder.symbol,
            orderType: normalizedOrder.orderType,
            side: normalizedOrder.side,
            timeInForce: normalizedOrder.timeInForce,
            orderQuantity: normalizedOrder.orderQuantity,
            limitPrice: normalizedOrder.limitPrice,
            stopPrice: normalizedOrder.stopPrice,
            orderStatus: normalizedOrder.orderStatus,
            orderPlacedTime: normalizedOrder.orderPlacedTime,
            orderExecutedTime: normalizedOrder.orderExecutedTime,
            accountId: normalizedOrder.accountId,
            orderAccount: normalizedOrder.orderAccount,
            orderRoute: normalizedOrder.orderRoute,
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
        errors: errors.length > 0 ? errors : null,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

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

    const headers = Object.keys(records[0]);
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
      mappingResult = await this.aiMapper.analyzeAndMapColumns(headers, records.slice(0, 10));
    }

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: detectedFormat ? this.getBrokerTypeFromFormat(detectedFormat) : 'GENERIC_CSV',
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: !userMappings,
        mappingConfidence: mappingResult.overallConfidence,
        columnMappings: mappingResult.mappings,
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
      mappingResult.detectedFormat = detectedFormat;
      mappingResult.formatConfidence = detectedFormat.confidence;
    }

    // Process with mappings
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const normalizedTrades = this.aiMapper.applyMappings(records, mappingResult.mappings, accountTags);

      for (const [index, trade] of normalizedTrades.entries()) {
        try {
          await prisma.trade.create({
            data: {
              userId,
              importBatchId: importBatch.id,
              date: trade.date,
              time: trade.time,
              symbol: trade.symbol,
              side: trade.side,
              volume: trade.volume,
              executions: 1,
              pnl: trade.pnl,
              price: trade.price,
              commission: trade.commission,
              fees: trade.fees,
              account: trade.account,
              notes: trade.notes,
              tags: trade.tags,
              // Required fields for enhanced schema
              orderFilledTime: trade.date,
              entryDate: trade.date,
              quantityFilled: trade.volume,
            },
          });

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        errors: errors.length > 0 ? errors : null,
        processingCompleted: new Date(),
      },
    });

    // Update upload log
    const parseMethod = userMappings ? 'USER_CORRECTED' : 'AI_MAPPED';
    await this.updateUploadLog(uploadLogId, 'IMPORTED', parseMethod, undefined, importBatch.id);

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
    status: any, 
    parseMethod?: any, 
    errorMessage?: string,
    importBatchId?: string
  ) {
    const updateData: any = { uploadStatus: status };
    
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
    userMappings: ColumnMapping[],
    accountTags: string[] = []
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

  private getBrokerTypeFromFormat(format: CsvFormat): any {
    const brokerMap: { [key: string]: any } = {
      'interactive-brokers-flex': 'INTERACTIVE_BROKERS',
      'td-ameritrade-history': 'TD_AMERITRADE',
      'etrade-transactions': 'E_TRADE',
      'fidelity-positions': 'FIDELITY',
      'robinhood-statements': 'ROBINHOOD',
      'custom-order-execution': 'GENERIC_CSV',
      'trade-voyager-orders': 'GENERIC_CSV',
      'schwab-todays-trades': 'CHARLES_SCHWAB',
    };
    
    return brokerMap[format.id] || 'GENERIC_CSV';
  }

  private applyDetectedFormatMapping(row: any, format: CsvFormat, accountTags: string[]): any {
    const normalizedData: any = {};
    
    // Apply mappings from detected format
    for (const [csvColumn, mapping] of Object.entries(format.fieldMappings)) {
      const value = row[csvColumn];
      if (value !== undefined && value !== null && value !== '') {
        let transformedValue = value;
        
        // Apply data transformers if specified
        if (mapping.transformer && DATA_TRANSFORMERS[mapping.transformer]) {
          transformedValue = DATA_TRANSFORMERS[mapping.transformer](value);
        }
        
        // Type conversion
        switch (mapping.dataType) {
          case 'number':
            transformedValue = parseFloat(String(transformedValue).replace(/[$,]/g, ''));
            break;
          case 'date':
            transformedValue = new Date(transformedValue);
            break;
          case 'boolean':
            transformedValue = Boolean(transformedValue);
            break;
          default:
            transformedValue = String(transformedValue);
        }
        
        normalizedData[mapping.tradeVoyagerField] = transformedValue;
      }
    }
    
    // Handle tags field (convert string to array)
    if (normalizedData.tags && typeof normalizedData.tags === 'string') {
      normalizedData.tags = [normalizedData.tags, ...accountTags];
    } else {
      normalizedData.tags = accountTags;
    }

    // Ensure required fields have defaults for orders
    const order = {
      orderId: normalizedData.orderId || '',
      parentOrderId: normalizedData.parentOrderId,
      symbol: normalizedData.symbol || '',
      orderType: normalizedData.orderType || 'MARKET',
      side: this.normalizeOrderSide(normalizedData.side || 'BUY'),
      timeInForce: 'DAY',
      orderQuantity: normalizedData.orderQuantity || 0,
      limitPrice: normalizedData.limitPrice,
      stopPrice: normalizedData.stopPrice,
      orderStatus: 'FILLED',
      orderPlacedTime: normalizedData.orderExecutedTime || new Date(),
      orderExecutedTime: normalizedData.orderExecutedTime || new Date(),
      accountId: normalizedData.accountId,
      orderAccount: normalizedData.orderAccount,
      orderRoute: normalizedData.orderRoute,
      tags: normalizedData.tags,
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
    for (const [index, order] of schwabResult.filledOrders.entries()) {
      try {
        await prisma.order.create({
          data: {
            userId,
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
    for (const [index, order] of schwabResult.workingOrders.entries()) {
      try {
        await prisma.order.create({
          data: {
            userId,
            orderId: `schwab-working-${Date.now()}-${index}`,
            symbol: order.symbol || '',
            orderType: this.normalizeOrderType(order.orderType || 'Market'),
            side: this.normalizeOrderSide(order.side || 'BUY'),
            timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
            orderQuantity: order.orderQuantity || 0,
            limitPrice: order.limitPrice,
            orderStatus: this.normalizeOrderStatus('WORKING'), // Working orders are PENDING
            orderPlacedTime: order.orderPlacedTime || new Date(),
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
    for (const [index, order] of schwabResult.cancelledOrders.entries()) {
      try {
        if (order.symbol) { // Only process orders with symbols
          await prisma.order.create({
            data: {
              userId,
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
    if (schwabResult.errors.length > 0) {
      errors.push(...schwabResult.errors);
      errorCount += schwabResult.errors.length;
    }

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === totalTrades ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : null,
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
    const typeMap: { [key: string]: any } = {
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
    const tifMap: { [key: string]: any } = {
      'DAY': 'DAY',
      'GTC': 'GTC',
      'IOC': 'IOC', 
      'FOK': 'FOK',
      'GTD': 'GTD'
    };
    return tifMap[timeInForce] || 'DAY';
  }

  private normalizeOrderStatus(orderStatus: string): 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED' {
    const statusMap: { [key: string]: any } = {
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