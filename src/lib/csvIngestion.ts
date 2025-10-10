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
import { OrderStagingService } from '@/lib/services/OrderStagingService';
import { createHash } from 'crypto';

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
  duplicateCount?: number; // Number of orders skipped as duplicates
  errors: string[];
  duplicateMessages?: string[]; // Details about skipped duplicates
  aiMappingResult?: AiMappingResult;
  openAiMappingResult?: OpenAiMappingResult;
  requiresUserReview: boolean;
  requiresBrokerSelection: boolean;
  backgroundJobId?: string;
  brokerFormatUsed?: string; // Name of broker format that was used
  aiIngestCheckId?: string; // ID of AI ingestion check for user review
  orderIds?: string[]; // IDs of created orders for AiIngestToCheck tracking
  staged?: boolean; // True if orders were staged instead of created
  stagedCount?: number; // Number of orders staged for approval
  requiresApproval?: boolean; // True if format requires admin approval
  pendingFormatName?: string; // Name of the format awaiting approval
  estimatedApprovalTime?: string; // Expected approval timeframe
  message?: string; // Additional message about the staging status
  isNewFormat?: boolean; // True if this is a newly created format vs existing pending format
  sessionComplete?: boolean; // True if upload session is complete
  sessionProgress?: string; // Progress indicator (e.g. "16/16")
  sessionAttempt?: number; // Current attempt number for this session
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
  assetClass?: string | null;
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

// Upload Session information
interface UploadSessionInfo {
  id: string; // Session ID (hash of filename + userId)
  expectedRowCount: number; // Total rows expected
  previousCompleted: number; // Rows successfully uploaded in previous attempts
  isNew: boolean; // True if this is a new session vs continuing existing
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
    // formatDetector will be initialized with database formats when needed
    this.formatDetector = new CsvFormatDetector();
    this.brokerFormatService = new BrokerFormatService();
    this.openAiService = new OpenAiMappingService();
  }

  /**
   * Convert a single pattern to RegExp, handling various serialized formats
   */
  private convertPatternToRegExp(pattern: any): RegExp | undefined {
    if (!pattern) return undefined;
    if (pattern instanceof RegExp) return pattern;

    try {
      if (typeof pattern === 'string') {
        // Handle regex patterns that might be serialized as strings
        // Check if it's a regex pattern like "/pattern/flags"
        const regexMatch = pattern.match(/^\/(.+)\/([gimuy]*)$/);
        if (regexMatch) {
          return new RegExp(regexMatch[1], regexMatch[2]);
        }
        // Otherwise treat as a plain string pattern
        return new RegExp(pattern);
      }

      if (pattern.source && typeof pattern.source === 'string') {
        // Handle objects with source and flags properties
        return new RegExp(pattern.source, pattern.flags || '');
      }
    } catch (error) {
      // Failed to convert pattern to RegExp
    }

    return undefined;
  }

  /**
   * Convert object of patterns to RegExp
   */
  private convertPatternsToRegExp(patterns: any): { [key: string]: RegExp } | undefined {
    if (!patterns || typeof patterns !== 'object') return undefined;

    const result: { [key: string]: RegExp } = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const regExp = this.convertPatternToRegExp(pattern);
      if (regExp) {
        result[key] = regExp;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Convert array of patterns to RegExp array
   */
  private convertArrayPatternsToRegExp(patterns: any[]): RegExp[] | undefined {
    if (!patterns || !Array.isArray(patterns)) return undefined;

    const result: RegExp[] = [];
    for (const pattern of patterns) {
      const regExp = this.convertPatternToRegExp(pattern);
      if (regExp) {
        result.push(regExp);
      }
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Load CSV formats from database and initialize the format detector
   */
  private async initializeFormatDetector(): Promise<void> {
    try {
      // Get popular formats from database
      const dbFormats = await this.brokerFormatService.getPopularFormats(50);

      // Convert database formats to CsvFormat interface
      const csvFormats: CsvFormat[] = dbFormats.map(dbFormat => ({
        id: dbFormat.id,
        name: dbFormat.formatName,
        description: dbFormat.description || '',
        fingerprint: dbFormat.headerFingerprint,
        confidence: dbFormat.confidence,
        fieldMappings: dbFormat.fieldMappings as any,
        detectionPatterns: {
          headerPattern: dbFormat.headers,
          // Convert sampleValuePatterns back to RegExp objects if they exist
          sampleValuePatterns: this.convertPatternsToRegExp(
            (dbFormat.sampleData as any)?.detectionPatterns?.sampleValuePatterns
          ),
          fileNamePatterns: this.convertArrayPatternsToRegExp(
            (dbFormat.sampleData as any)?.detectionPatterns?.fileNamePatterns
          ),
          specialDetection: (dbFormat.sampleData as any)?.detectionPatterns?.specialDetection
            ? {
                fileStartPattern: this.convertPatternToRegExp(
                  (dbFormat.sampleData as any).detectionPatterns.specialDetection.fileStartPattern
                ),
                sectionHeaders: (dbFormat.sampleData as any).detectionPatterns.specialDetection.sectionHeaders
              }
            : undefined,
        },
        brokerName: dbFormat.broker.name,
        version: '1.0',
        createdAt: dbFormat.createdAt,
        updatedAt: dbFormat.updatedAt,
        usageCount: dbFormat.usageCount,
        createdBy: dbFormat.createdBy || undefined,
      }));

      // Initialize format detector with loaded formats
      this.formatDetector = new CsvFormatDetector(csvFormats);

      // Successfully loaded CSV formats from database
    } catch (error) {
      // Failed to load CSV formats from database
      // Fallback to empty detector
      this.formatDetector = new CsvFormatDetector([]);
    }
  }

  /**
   * Helper method to safely parse date strings, returning null for invalid dates
   */
  private parseDateSafely(dateValue: unknown): Date | null {
    if (!dateValue) {
      return null;
    }

    const dateString = String(dateValue).trim();
    if (!dateString || dateString === 'undefined' || dateString === 'null') {
      return null;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
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
    return values.join(' ');
  }

  /**
   * Helper method to determine appropriate orderExecutedTime based on whether we have a specific execution time mapping
   */
  private getOrderExecutedTime(mappedData: Record<string, unknown>, mappings?: Record<string, any> | ColumnMapping[]): Date {
    // If we have a specific orderExecutedTime from mapping, use it
    if (mappedData.orderExecutedTime) {
      const parsedDate = this.parseDateSafely(mappedData.orderExecutedTime);
      if (parsedDate) {
        return parsedDate;
      }
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
      const parsedDate = this.parseDateSafely(mappedData.orderPlacedTime);
      if (parsedDate) {
        return parsedDate;
      }
    }

    // Fallback to current time if no valid placed time either
    const fallbackDate = this.parseDateSafely(mappedData.orderPlacedTime);
    return fallbackDate || new Date();
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
   * Checks across ALL imports for the user, not just the current batch
   * Uses brokerId for more reliable duplicate detection
   */
  private async isDuplicateOrder(
    userId: string,
    importBatchId: string,
    symbol: string,
    orderQuantity: number,
    orderExecutedTime: Date,
    brokerId: string,
    limitPrice?: number | null
  ): Promise<boolean> {
    const whereClause: any = {
      userId,
      symbol,
      orderQuantity,
      orderExecutedTime,
      brokerId: brokerId,
    };

    // Include limitPrice in duplicate detection if it exists
    if (limitPrice !== null && limitPrice !== undefined) {
      whereClause.limitPrice = limitPrice;
    }

    const existingOrder = await prisma.order.findFirst({
      where: whereClause
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

    // Initialize format detector with database formats
    await this.initializeFormatDetector();
    
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
        
        // Get format detection using our initialized detector
        await this.initializeFormatDetector();
        const formatDetection = this.formatDetector.detectFormat(headers, sampleRows, fileContent);
        
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

    } catch (error: unknown) {
      return {
        isValid: false,
        isStandardFormat: false,
        headers: [],
        sampleRows: [],
        rowCount: 0,
        errors: [`Failed to parse CSV: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`],
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
      console.error('❌ CSV validation failed:', validation.errors);
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

      console.log('[CSV_INGESTION] Broker detection result:', {
        broker: brokerDetection.broker?.name,
        format: brokerDetection.format?.formatName,
        confidence: brokerDetection.confidence,
        isExactMatch: brokerDetection.isExactMatch
      });


      
      // Decision tree for processing method
      if (isSchwabFormat && !userMappings) {

        return await this.processSchwabCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize
        );
      } else if (validation.isStandardFormat && !userMappings) {

        return await this.processStandardCsv(
          fileContent, 
          fileName, 
          userId, 
          accountTags, 
          uploadLog.id,
          validation.fileSize
        );
      } else if (brokerDetection.isExactMatch && brokerDetection.confidence >= 0.8 && !userMappings) {

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

        return await this.processOpenAiCsv(
          fileContent,
          fileName,
          userId,
          accountTags,
          uploadLog.id,
          validation.fileSize
        );
      } else {

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
    } catch (error: unknown) {
      // Update upload log with error
      await this.updateUploadLog(uploadLog.id, 'FAILED', undefined, (error as any) instanceof Error ? (error as Error).message : 'Unknown error');
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

    // Check if format is approved - if not, route to staging
    if (!brokerDetection.format.isApproved) {
      console.log(`[CSV Ingestion] Format ${brokerDetection.format.id} not approved, routing to staging`);
      return await this.processWithUnapprovedFormat(
        records,
        brokerDetection.format,
        fileName,
        userId,
        accountTags,
        uploadLogId,
        fileSize,
        brokerDetection
      );
    }

    // Continue with normal processing for approved formats
    console.log(`[CSV Ingestion] Processing with approved format ${brokerDetection.format.formatName}`);

    // Detect or create upload session BEFORE creating orders
    const session = await this.detectOrCreateSession(userId, fileName, records.length);

    // Create import batch with session info
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
        // Session fields
        uploadSessionId: session.id,
        expectedRowCount: session.expectedRowCount,
        completedRowCount: 0,
        isSessionComplete: false,
        holdTradeCalculation: true,
        sessionStatus: 'ACTIVE',
        sessionAttempts: session.isNew ? 1 : (await this.getSessionAttemptCount(session.id) + 1),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'STANDARD', undefined, importBatch.id);

    const errors: string[] = [];
    const duplicateMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const createdOrderIds: string[] = []; // Track created order IDs for AiIngestToCheck

    // Extract mappings from the stored format
    const fieldMappings = brokerDetection.format.fieldMappings as Record<string, any>;
    const brokerName = brokerDetection.broker.name.replace(/[^A-Za-z0-9]/g, '_'); // Clean broker name for ID

    // Process each row using stored broker format mappings
    for (let i = 0; i < records.length; i++) {
      try {
        const mappedData: Record<string, unknown> = {};
        const brokerMetadata: Record<string, unknown> = {};

        // Apply stored mappings (supports both single and multiple field mappings)
        for (const [csvHeader, mapping] of Object.entries(fieldMappings)) {
          // Use combineFieldValues to get the value (handles field combination)
          const value = this.combineFieldValues(records[i] as Record<string, unknown>, csvHeader, mapping);

          if (value !== undefined && value !== null && value !== '') {
            // Handle new format with multiple fields
            if (mapping.fields && Array.isArray(mapping.fields)) {
              // Map the CSV value to all specified order fields
              mapping.fields.forEach((field: string) => {
                if (field === 'brokerMetadata' || mapping.confidence < 0.5) {
                  brokerMetadata[csvHeader] = value;
                } else {
                  mappedData[field] = value;
                }
              });
            } else if (mapping.field) {
              // Handle legacy format with single field
              if (mapping.field === 'brokerMetadata' || mapping.confidence < 0.5) {
                brokerMetadata[csvHeader] = value;
              } else {
                mappedData[mapping.field] = value;
              }
            } else {
              // Very old format where mapping is just the field name
              if (typeof mapping === 'string') {
                mappedData[mapping] = value;
              }
            }
          }
        }

        // Infer side from quantity if no explicit side indicator exists
        this.inferSideFromQuantity(mappedData, records[i] as Record<string, unknown>, fieldMappings);

        // Calculate times using helper method
        const orderPlacedTime = this.parseDateSafely(mappedData.orderPlacedTime) || new Date();
        const orderExecutedTime = this.getOrderExecutedTime(mappedData, brokerDetection.format.fieldMappings as Record<string, any>);
        const symbol = String(mappedData.symbol || '');
        const orderQuantity = Number(mappedData.orderQuantity) || 0;
        const brokerType = this.getBrokerTypeFromName(brokerDetection.broker.name);
        const brokerId = brokerDetection.format.brokerId; // Get brokerId from matched format

        // Check for duplicate
        const limitPrice = mappedData.limitPrice ? Number(mappedData.limitPrice) : null;
        if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerId, limitPrice)) {
          duplicateCount++;
          const duplicateMessage = `Row ${i + 1}: Duplicate order ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}${limitPrice ? ` (limit: $${limitPrice})` : ''}`;
          duplicateMessages.push(duplicateMessage);

          continue; // Skip this duplicate order
        }

        // Create order record
        const createdOrder = await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: String(mappedData.orderId || `${brokerName}-${Date.now()}-${i}`),
            parentOrderId: mappedData.parentOrderId ? String(mappedData.parentOrderId) : null,
            symbol,
            assetClass: this.normalizeAssetClass(String(mappedData.assetClass || 'EQUITY')) as any,
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
            brokerId: brokerId, // From matched BrokerCsvFormat
            brokerMetadata: Object.keys(brokerMetadata).length > 0 ? brokerMetadata as any : null,
            tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
          },
        });

        // Collect the created order ID for AiIngestToCheck
        createdOrderIds.push(createdOrder.id);

        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const errorMessage = `Row ${i + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`;
        errors.push(errorMessage);
      }
    }

    // Calculate total valid rows (new inserts + duplicates)
    const totalValidRows = successCount + duplicateCount;
    // Only count new inserts toward completedRowCount
    const totalCompleted = session.previousCompleted + successCount;
    // Session is complete when all expected rows are accounted for (including duplicates)
    const isComplete = totalValidRows >= session.expectedRowCount;

    // Update import batch with results and session status
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : (isComplete ? 'COMPLETED' : 'PARTIAL'),
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        completedRowCount: totalCompleted,
        isSessionComplete: isComplete,
        holdTradeCalculation: !isComplete,
        sessionStatus: isComplete ? 'COMPLETED' : 'ACTIVE',
        processingCompleted: isComplete ? new Date() : null,
      },
    });

    // Update format usage statistics
    await this.brokerFormatService.updateFormatUsage(brokerDetection.format.id, successCount > 0);

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

    // ONLY calculate trades if session is complete
    if (successCount > 0 && isComplete) {
      try {
        console.log(`[Trade Calculation] ✓ Session complete. Triggering trade calculation...`);
        console.log(`[Trade Calculation] - Session ID: ${session.id}`);
        console.log(`[Trade Calculation] - Total completed: ${totalCompleted}/${session.expectedRowCount}`);
        console.log(`[Trade Calculation] - Import batch: ${importBatch.id}`);
        console.log(`[Trade Calculation] - User: ${userId}`);

        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);

        console.log(`[Trade Calculation] ✓ Trade calculation completed successfully`);
      } catch (error: unknown) {
        console.error(`[Trade Calculation] ✗ Trade calculation FAILED for session ${session.id}:`, error);
        console.error(`[Trade Calculation] Error details:`, error instanceof Error ? (error as Error).message : 'Unknown error');
        console.error(`[Trade Calculation] Stack trace:`, error instanceof Error ? (error as Error).stack : 'No stack trace');
        // Don't fail the import if trade calculation fails
      }
    } else if (successCount > 0) {
      console.log(`[Trade Calculation] ⏳ Session incomplete. Holding trade calculation.`);
      console.log(`[Trade Calculation] - Progress: ${totalValidRows}/${session.expectedRowCount}`);
      console.log(`[Trade Calculation] - Session ID: ${session.id}`);
    } else {
      console.log(`[Trade Calculation] ⏭️  No successful rows in this batch. Session status: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    }

    return {
      success: successCount > 0 || isComplete,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      duplicateCount: duplicateCount > 0 ? duplicateCount : undefined,
      errors,
      duplicateMessages: duplicateMessages.length > 0 ? duplicateMessages : undefined,
      requiresUserReview: false,
      requiresBrokerSelection: false,
      brokerFormatUsed: brokerDetection.format.formatName,
      orderIds: createdOrderIds,
      // Session-specific fields
      sessionComplete: isComplete,
      sessionProgress: `${totalValidRows}/${session.expectedRowCount}`,
      sessionAttempt: importBatch.sessionAttempts,
    };
  }

  /**
   * Process CSV with unapproved format - route to staging for admin approval
   */
  private async processWithUnapprovedFormat(
    records: any[],
    format: any,
    fileName: string,
    userId: string,
    accountTags: string[],
    uploadLogId: string,
    fileSize: number,
    brokerDetection: FormatDetectionResult,
    isNewFormat: boolean = false
  ): Promise<CsvIngestionResult> {

    console.log(`[CSV Ingestion] Staging ${records.length} orders for unapproved format ${format.id}`);

    // Create import batch for staging
    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType: this.getBrokerTypeFromName(brokerDetection.broker!.name),
        importType: 'CUSTOM',
        status: 'PENDING', // Different status for staging
        totalRecords: records.length,
        aiMappingUsed: false,
        mappingConfidence: brokerDetection.confidence,
        columnMappings: format.fieldMappings as any,
        userReviewRequired: true, // Requires admin review
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'VALIDATED', 'AI_MAPPED', undefined, importBatch.id);

    try {
      // Use OrderStagingService to stage the orders
      const stagingService = new OrderStagingService();
      const stagingResult = await stagingService.stageOrders(
        records,
        format,
        importBatch,
        userId
      );

      console.log(`[CSV Ingestion] Staging completed: ${stagingResult.stagedCount} staged, ${stagingResult.errorCount} errors`);

      const message = isNewFormat
        ? `New broker format uploaded, waiting for admin review.`
        : `Your CSV file matches an existing format (${format.formatName}) that is currently awaiting admin approval.`;

      return {
        success: stagingResult.success,
        importBatchId: importBatch.id,
        importType: 'CUSTOM',
        totalRecords: records.length,
        successCount: 0, // No orders created yet
        errorCount: stagingResult.errorCount,
        errors: stagingResult.errors,
        requiresUserReview: true,
        requiresBrokerSelection: false,
        brokerFormatUsed: format.formatName,
        staged: true,
        stagedCount: stagingResult.stagedCount,
        requiresApproval: true,
        pendingFormatName: format.formatName,
        estimatedApprovalTime: "typically less than 24 hours (up to 5 business days)",
        message,
        isNewFormat,
      };

    } catch (error) {
      console.error('[CSV Ingestion] Staging failed:', error);

      // Update import batch with failure
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED',
          errorCount: records.length,
          errors: [error instanceof Error ? error.message : 'Staging failed']
        }
      });

      // Update upload log
      await this.updateUploadLog(uploadLogId, 'FAILED', 'AI_MAPPED');

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
      } catch (error: unknown) {
        errorCount++;
        const errorMessage = `Row ${i + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`;
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
      } catch (error: unknown) {
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

    // Look up the BrokerCsvFormat to get brokerId
    const brokerCsvFormat = await prisma.brokerCsvFormat.findUnique({
      where: { id: detectedFormat.id },
      select: { brokerId: true }
    });

    // Detect or create upload session BEFORE creating orders
    const session = await this.detectOrCreateSession(userId, fileName, records.length);

    // Create import batch with session info
    const brokerType = this.getBrokerTypeFromFormat(detectedFormat);

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
        // Session fields
        uploadSessionId: session.id,
        expectedRowCount: session.expectedRowCount,
        completedRowCount: 0,
        isSessionComplete: false,
        holdTradeCalculation: true,
        sessionStatus: 'ACTIVE',
        sessionAttempts: session.isNew ? 1 : (await this.getSessionAttemptCount(session.id) + 1),
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'PARSING', 'STANDARD', undefined, importBatch.id);

    const errors: string[] = [];
    const duplicateMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Process each row using detected format mappings
    for (let i = 0; i < records.length; i++) {
      try {
        const normalizedOrder = this.applyDetectedFormatMapping(records[i] as Record<string, unknown>, detectedFormat, accountTags);

        // Create order record
        const orderBrokerType = this.getBrokerTypeFromFormat(detectedFormat);
        const brokerId = brokerCsvFormat?.brokerId || ''; // Get brokerId from format or empty string as fallback
        if (i === 0) {

        }

        // Check for duplicate
        if (await this.isDuplicateOrder(userId, importBatch.id, normalizedOrder.symbol, normalizedOrder.orderQuantity, normalizedOrder.orderExecutedTime, brokerId, normalizedOrder.limitPrice)) {
          duplicateCount++;
          const duplicateMessage = `Row ${i + 1}: Duplicate order ${normalizedOrder.symbol} ${normalizedOrder.orderQuantity} shares at ${normalizedOrder.orderExecutedTime.toISOString()}${normalizedOrder.limitPrice ? ` (limit: $${normalizedOrder.limitPrice})` : ''}`;
          duplicateMessages.push(duplicateMessage);

          continue; // Skip this duplicate order
        }

        await prisma.order.create({
          data: {
            userId,
            importBatchId: importBatch.id,
            orderId: normalizedOrder.orderId,
            parentOrderId: normalizedOrder.parentOrderId,
            symbol: normalizedOrder.symbol,
            assetClass: this.normalizeAssetClass(String(normalizedOrder.assetClass || 'EQUITY')) as any,
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
            brokerId: brokerCsvFormat?.brokerId, // From matched BrokerCsvFormat
            tags: normalizedOrder.tags,
          },
        });

        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const errorMessage = `Row ${i + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`;
        errors.push(errorMessage);
      }
    }

    // Calculate total valid rows (new inserts + duplicates)
    const totalValidRows = successCount + duplicateCount;
    // Only count new inserts toward completedRowCount
    const totalCompleted = session.previousCompleted + successCount;
    // Session is complete when all expected rows are accounted for (including duplicates)
    const isComplete = totalValidRows >= session.expectedRowCount;

    // Update import batch with results and session status
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : (isComplete ? 'COMPLETED' : 'PARTIAL'),
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        completedRowCount: totalCompleted,
        isSessionComplete: isComplete,
        holdTradeCalculation: !isComplete,
        sessionStatus: isComplete ? 'COMPLETED' : 'ACTIVE',
        processingCompleted: isComplete ? new Date() : null,
      },
    });

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'STANDARD');

    // ONLY calculate trades if session is complete
    if (successCount > 0 && isComplete) {
      try {
        console.log(`[Trade Calculation] ✓ Session complete. Triggering trade calculation...`);
        console.log(`[Trade Calculation] - Session ID: ${session.id}`);
        console.log(`[Trade Calculation] - Total completed: ${totalCompleted}/${session.expectedRowCount}`);
        console.log(`[Trade Calculation] - Import batch: ${importBatch.id}`);
        console.log(`[Trade Calculation] - User: ${userId}`);

        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);

        console.log(`[Trade Calculation] ✓ Trade calculation completed successfully`);
      } catch (error: unknown) {
        console.error(`[Trade Calculation] ✗ Trade calculation FAILED for session ${session.id}:`, error);
        console.error(`[Trade Calculation] Error details:`, error instanceof Error ? (error as Error).message : 'Unknown error');
        console.error(`[Trade Calculation] Stack trace:`, error instanceof Error ? (error as Error).stack : 'No stack trace');
        // Don't fail the import if trade calculation fails
      }
    } else if (successCount > 0) {
      console.log(`[Trade Calculation] ⏳ Session incomplete. Holding trade calculation.`);
      console.log(`[Trade Calculation] - Progress: ${totalValidRows}/${session.expectedRowCount}`);
      console.log(`[Trade Calculation] - Session ID: ${session.id}`);
    } else {
      console.log(`[Trade Calculation] ⏭️  No successful rows in this batch. Session status: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    }

    return {
      success: successCount > 0 || isComplete,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      duplicateCount: duplicateCount > 0 ? duplicateCount : undefined,
      errors,
      duplicateMessages: duplicateMessages.length > 0 ? duplicateMessages : undefined,
      requiresUserReview: false,
      requiresBrokerSelection: false,
      // Session-specific fields
      sessionComplete: isComplete,
      sessionProgress: `${totalValidRows}/${session.expectedRowCount}`,
      sessionAttempt: importBatch.sessionAttempts,
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

    // Detect or create upload session BEFORE creating orders
    const session = await this.detectOrCreateSession(userId, fileName, records.length);

    // Look up brokerId if detectedFormat is provided
    let brokerId: string | undefined;
    if (detectedFormat?.id) {
      const brokerCsvFormat = await prisma.brokerCsvFormat.findUnique({
        where: { id: detectedFormat.id },
        select: { brokerId: true }
      });
      brokerId = brokerCsvFormat?.brokerId;
    }

    // Create import batch with proper broker type detection
    let brokerType: BrokerType = BrokerType.GENERIC_CSV;
    if (detectedFormat?.brokerName) {
      brokerType = this.getBrokerTypeFromName(detectedFormat.brokerName);
    }

    const importBatch = await prisma.importBatch.create({
      data: {
        userId,
        filename: fileName,
        fileSize,
        brokerType,
        importType: 'CUSTOM',
        status: 'PROCESSING',
        totalRecords: records.length,
        aiMappingUsed: !userMappings,
        mappingConfidence: mappingResult.overallConfidence,
        columnMappings: mappingResult.mappings as unknown as Prisma.InputJsonValue,
        userReviewRequired: true, // Always require review for AI-generated mappings
        // Session fields
        uploadSessionId: session.id,
        expectedRowCount: session.expectedRowCount,
        completedRowCount: 0,
        isSessionComplete: false,
        holdTradeCalculation: true,
        sessionStatus: 'ACTIVE',
        sessionAttempts: session.isNew ? 1 : (await this.getSessionAttemptCount(session.id) + 1),
      },
    });

    // Create AiIngestToCheck record if using AI mapping (not user mappings)
    let aiIngestCheck: any = null;
    if (!userMappings) {
      // Find or create a generic broker for unknown formats
      let genericBroker = await prisma.broker.findUnique({
        where: { name: 'Unknown' }
      });
      
      if (!genericBroker) {
        genericBroker = await prisma.broker.create({
          data: { name: 'Unknown' }
        });
      }

      // Generate header fingerprint
      const openAiService = new OpenAiMappingService();
      const headerFingerprint = openAiService.generateHeaderFingerprint(headers);

      // Create or find broker CSV format for this new mapping
      let brokerCsvFormat = await prisma.brokerCsvFormat.findFirst({
        where: {
          brokerId: genericBroker.id,
          headerFingerprint: headerFingerprint
        }
      });

      if (!brokerCsvFormat) {
        brokerCsvFormat = await prisma.brokerCsvFormat.create({
          data: {
            brokerId: genericBroker.id,
            formatName: `Generic_AI_${Date.now()}`,
            description: `AI-generated mapping for ${fileName}`,
            headerFingerprint: headerFingerprint,
            headers: headers,
            fieldMappings: mappingResult.mappings as unknown as Prisma.InputJsonValue,
            confidence: mappingResult.overallConfidence
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
          aiConfidence: mappingResult.overallConfidence,
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
        // Session fields (review pending, no orders processed yet)
        sessionComplete: false,
        sessionProgress: `0/${session.expectedRowCount}`,
        sessionAttempt: importBatch.sessionAttempts,
      };
    }

    // Include detected format info in the mapping result if available
    if (detectedFormat && !userMappings) {
      mappingResult.detectedFormat = detectedFormat as unknown as Record<string, unknown>;
      mappingResult.formatConfidence = detectedFormat!.confidence;
    }

    // Process with mappings
    const errors: string[] = [];
    const duplicateMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    try {
      // Check if this is an order format (has orderId field mapping)
      const isOrderFormat = mappingResult.mappings.some(m => 'tradeVoyagerField' in m && (m as any).tradeVoyagerField === 'orderId');

      // Use proper broker type detection based on detected format or name
      let brokerType: BrokerType = BrokerType.GENERIC_CSV;
      const formatBrokerName = detectedFormat?.brokerName || '';
      if (formatBrokerName) {
        brokerType = this.getBrokerTypeFromName(formatBrokerName);
      }
      
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
                const targetField = (mapping as any).tradeVoyagerField as string;
                const csvColumn = (mapping as any).csvColumn as string;
                
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

            }

            // Infer side from quantity if no explicit side indicator exists
            this.inferSideFromQuantity(mappedData, row as Record<string, unknown>, mappingResult.mappings);

            // Calculate times using helper method
            const orderPlacedTime = this.parseDateSafely(mappedData.orderPlacedTime) || new Date();
            const orderExecutedTime = this.getOrderExecutedTime(mappedData, mappingResult.mappings);
            const symbol = String(mappedData.symbol || '');
            const orderQuantity = Number(mappedData.orderQuantity) || 0;

            // Check for duplicate
            const limitPrice = mappedData.limitPrice ? Number(mappedData.limitPrice) : null;
            if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerId || '', limitPrice)) {
              duplicateCount++;
              const duplicateMessage = `Row ${index + 1}: Duplicate order ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}${limitPrice ? ` (limit: $${limitPrice})` : ''}`;
              duplicateMessages.push(duplicateMessage);

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
                assetClass: this.normalizeAssetClass(String(mappedData.assetClass || 'EQUITY')) as any,
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
                brokerId, // From detected format if available
                tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
              },
            });
            
            successCount++;
          } catch (error: unknown) {
            errorCount++;
            const errorMessage = (error as any) instanceof Error ? (error as Error).message : 'Unknown error';
            errors.push(`Row ${index + 1}: ${errorMessage}`);
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
          } catch (error: unknown) {
            errorCount++;
            const errorMessage = (error as any) instanceof Error ? (error as Error).message : 'Unknown error';
            errors.push(`Row ${index + 1}: ${errorMessage}`);
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = (error as any) instanceof Error ? (error as Error).message : 'Unknown error';
      errors.push(`Mapping application failed: ${errorMessage}`);
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
      } catch (error: unknown) {
        console.error('Trade calculation error:', error);
        // Don't fail the import if trade calculation fails
      }
    }

    return {
      success: successCount > 0,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      duplicateCount: duplicateCount > 0 ? duplicateCount : undefined,
      errors,
      duplicateMessages: duplicateMessages.length > 0 ? duplicateMessages : undefined,
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
      
      try {
        // Determine broker type from provided broker name
        let brokerType: BrokerType = BrokerType.GENERIC_CSV;
        if (brokerName) {
          brokerType = this.getBrokerTypeFromName(brokerName);
        }

        // Create a temporary import batch for later processing
        const importBatch = await prisma.importBatch.create({
          data: {
            userId,
            filename: fileName,
            fileSize,
            brokerType,
            importType: 'CUSTOM',
            status: 'PENDING',
            totalRecords: records.length,
            aiMappingUsed: false,
            userReviewRequired: true,
            tempFileContent: fileContent, // Store the file content for later processing
          },
        });




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
      } catch (error) {
        console.error('❌ Failed to create ImportBatch for broker selection:', error);
        console.error('💥 Error details:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error(`Failed to create import batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    
    // Generate AI mappings WITHOUT creating broker format yet
    // The format will be created later after user approval
    const aiResult = await this.openAiService.analyzeHeaders({
      csvHeaders: headers,
      sampleData,
      brokerName: brokerName
    });

    // Detect or create upload session BEFORE creating orders
    const session = await this.detectOrCreateSession(userId, fileName, records.length);

    // Look up or create broker to get brokerId
    let brokerId: string | undefined;
    if (brokerName) {
      const broker = await this.brokerFormatService.findOrCreateBroker(brokerName);
      brokerId = broker.id;
    }

    let importBatch: any;
    try {
      // Create import batch
      importBatch = await prisma.importBatch.create({
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

    } catch (error) {
      console.error('❌ Failed to create ImportBatch for AI mapping:', error);
      console.error('💥 Error details:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to create import batch for AI mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

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
    const duplicateMessages: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    try {
      for (const [index, row] of records.entries()) {
        try {
          const mappedData: Record<string, unknown> = {};
          const brokerMetadata: Record<string, unknown> = {};

          // Apply OpenAI mappings
          for (const [csvHeader, mapping] of Object.entries(aiResult.mappings)) {
            // Use combineFieldValues to get the value (handles field combination)
            const value = this.combineFieldValues(row as Record<string, unknown>, csvHeader, mapping);

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

          // Infer side from quantity if no explicit side indicator exists
          this.inferSideFromQuantity(mappedData, row as Record<string, unknown>, aiResult.mappings);

          // Calculate times using helper method
          const orderPlacedTime = this.parseDateSafely(mappedData.orderPlacedTime) || new Date();
          const orderExecutedTime = this.getOrderExecutedTime(mappedData, aiResult.mappings);
          const symbol = String(mappedData.symbol || '');
          const orderQuantity = Number(mappedData.orderQuantity) || 0;

          // Use proper broker type detection
          let brokerType: BrokerType = BrokerType.GENERIC_CSV;
          if (brokerName) {
            brokerType = this.getBrokerTypeFromName(brokerName!);
          }

          // Check for duplicate
          const limitPrice = mappedData.limitPrice ? Number(mappedData.limitPrice) : null;
          if (await this.isDuplicateOrder(userId, importBatch.id, symbol, orderQuantity, orderExecutedTime, brokerId || '', limitPrice)) {
            duplicateCount++;
            const duplicateMessage = `Row ${index + 1}: Duplicate order ${symbol} ${orderQuantity} shares at ${orderExecutedTime.toISOString()}${limitPrice ? ` (limit: $${limitPrice})` : ''}`;
            duplicateMessages.push(duplicateMessage);

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
              assetClass: this.normalizeAssetClass(String(mappedData.assetClass || 'EQUITY')) as any,
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
              brokerId, // From broker lookup if brokerName provided
              brokerMetadata: Object.keys(brokerMetadata).length > 0 ? brokerMetadata as any : null,
              tags: [...accountTags, ...(mappedData.tags ? String(mappedData.tags).split(',') : [])],
            },
          });
          
          successCount++;
        } catch (error: unknown) {
          errorCount++;
          errors.push(`Row ${index + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`);
        }
      }
    } catch (error: unknown) {
      errors.push(`OpenAI mapping application failed: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`);
      errorCount = records.length;
    }

    // Calculate total valid rows (new inserts + duplicates)
    const totalValidRows = successCount + duplicateCount;
    // Only count new inserts toward completedRowCount
    const totalCompleted = session.previousCompleted + successCount;
    // Session is complete when all expected rows are accounted for (including duplicates)
    const isComplete = totalValidRows >= session.expectedRowCount;

    // Update import batch with results and session status
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === records.length ? 'FAILED' : (isComplete ? 'COMPLETED' : 'PARTIAL'),
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        completedRowCount: totalCompleted,
        isSessionComplete: isComplete,
        holdTradeCalculation: !isComplete,
        sessionStatus: isComplete ? 'COMPLETED' : 'ACTIVE',
        processingCompleted: isComplete ? new Date() : null,
      },
    });

    // Format usage statistics will be updated when the format is actually created
    // after user approval in the finalize-mappings endpoint

    // Update upload log
    await this.updateUploadLog(uploadLogId, 'IMPORTED', 'AI_MAPPED', undefined, importBatch.id);

    // ONLY calculate trades if session is complete
    if (successCount > 0 && isComplete) {
      try {
        console.log(`[Trade Calculation] ✓ Session complete. Triggering trade calculation...`);
        console.log(`[Trade Calculation] - Session ID: ${session.id}`);
        console.log(`[Trade Calculation] - Total completed: ${totalCompleted}/${session.expectedRowCount}`);
        console.log(`[Trade Calculation] - Import batch: ${importBatch.id}`);
        console.log(`[Trade Calculation] - User: ${userId}`);

        const tradeBuilder = new TradeBuilder();
        await tradeBuilder.processUserOrders(userId);
        await tradeBuilder.persistTrades(userId);

        console.log(`[Trade Calculation] ✓ Trade calculation completed successfully`);
      } catch (error: unknown) {
        console.error(`[Trade Calculation] ✗ Trade calculation FAILED for session ${session.id}:`, error);
        console.error(`[Trade Calculation] Error details:`, error instanceof Error ? (error as Error).message : 'Unknown error');
        console.error(`[Trade Calculation] Stack trace:`, error instanceof Error ? (error as Error).stack : 'No stack trace');
        // Don't fail the import if trade calculation fails
      }
    } else if (successCount > 0) {
      console.log(`[Trade Calculation] ⏳ Session incomplete. Holding trade calculation.`);
      console.log(`[Trade Calculation] - Progress: ${totalValidRows}/${session.expectedRowCount}`);
      console.log(`[Trade Calculation] - Session ID: ${session.id}`);
    } else {
      console.log(`[Trade Calculation] ⏭️  No successful rows in this batch. Session status: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    }

    return {
      success: successCount > 0 || isComplete,
      importBatchId: importBatch.id,
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount,
      errorCount,
      duplicateCount: duplicateCount > 0 ? duplicateCount : undefined,
      errors,
      duplicateMessages: duplicateMessages.length > 0 ? duplicateMessages : undefined,
      openAiMappingResult: aiResult,
      requiresUserReview: false,
      requiresBrokerSelection: false,
      brokerFormatUsed: brokerName || 'AI_Generated',
      // Session-specific fields
      sessionComplete: isComplete,
      sessionProgress: `${totalValidRows}/${session.expectedRowCount}`,
      sessionAttempt: importBatch.sessionAttempts,
    };
  }

  /**
   * Process an existing import batch with AI mappings after broker selection
   */
  async processExistingBatchWithAiMappings(
    importBatchId: string,
    brokerName: string,
    userId: string
  ): Promise<CsvIngestionResult> {
    
    // Get the existing import batch
    const importBatch = await prisma.importBatch.findUnique({
      where: { 
        id: importBatchId,
        userId // Ensure user owns this batch
      }
    });

    if (!importBatch) {
      throw new Error('Import batch not found');
    }

    if (importBatch.status !== 'PENDING') {
      throw new Error('Import batch is not in pending state');
    }

    if (!importBatch.tempFileContent) {
      throw new Error('File content not found. The temporary data may have expired. Please re-upload the file.');
    }


    // Parse the stored file content
    const records = parse(importBatch.tempFileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    const headers = Object.keys(records[0] as Record<string, unknown>);
    const sampleData = records.slice(0, 5) as Record<string, unknown>[];

    
    // Generate AI mappings
    const aiResult = await this.openAiService.analyzeHeaders({
      csvHeaders: headers,
      sampleData,
      brokerName: brokerName
    });
    



    // Update the existing import batch with AI mappings
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        brokerType: this.getBrokerTypeFromName(brokerName),
        status: 'PENDING', // Keep as PENDING for user review
        aiMappingUsed: true,
        mappingConfidence: aiResult.overallConfidence,
        userReviewRequired: true,
        columnMappings: {
          pendingAiMappings: aiResult.mappings,
          pendingBrokerName: brokerName,
          pendingMetadata: aiResult.brokerMetadataFields,
          overallConfidence: aiResult.overallConfidence
        } as any,
      },
    });




    return {
      success: false,
      importBatchId: importBatch.id, // Return the SAME import batch ID
      importType: 'CUSTOM',
      totalRecords: records.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      openAiMappingResult: aiResult,
      requiresUserReview: true,
      requiresBrokerSelection: false,
      brokerFormatUsed: brokerName,
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

  /**
   * Get broker ID from database based on detected format or broker name
   */
  private async getBrokerIdFromDetectedFormat(detectedFormat?: CsvFormat, brokerName?: string): Promise<string | null> {
    let searchName = brokerName;

    // If we have a detected format, use its broker name
    if (detectedFormat?.brokerName) {
      searchName = detectedFormat.brokerName;
    }

    if (!searchName) return null;

    try {
      // First try to find broker by exact name
      let broker = await prisma.broker.findFirst({
        where: {
          name: {
            equals: searchName,
            mode: 'insensitive'
          }
        }
      });

      // If not found, try to find by alias
      if (!broker) {
        const brokerAlias = await prisma.brokerAlias.findFirst({
          where: {
            alias: {
              equals: searchName,
              mode: 'insensitive'
            }
          },
          include: {
            broker: true
          }
        });

        if (brokerAlias) {
          broker = brokerAlias.broker;
        }
      }

      // If still not found, try fuzzy matching with common variations
      if (!broker) {
        const normalized = searchName.toLowerCase();

        if (normalized.includes('interactive') || normalized.includes('ibkr')) {
          broker = await prisma.broker.findFirst({ where: { name: 'Interactive Brokers' } });
        } else if (normalized.includes('schwab') || normalized.includes('charles')) {
          broker = await prisma.broker.findFirst({ where: { name: 'Charles Schwab' } });
        } else if (normalized.includes('ameritrade') || normalized.includes('thinkorswim')) {
          broker = await prisma.broker.findFirst({ where: { name: 'TD Direct Investing' } });
        } else if (normalized.includes('etrade') || normalized.includes('e*trade')) {
          broker = await prisma.broker.findFirst({ where: { name: 'E*Trade' } });
        } else if (normalized.includes('fidelity')) {
          broker = await prisma.broker.findFirst({ where: { name: 'Fidelity' } });
        } else if (normalized.includes('robinhood')) {
          broker = await prisma.broker.findFirst({ where: { name: 'Robinhood' } });
        }
      }

      return broker?.id || null;
    } catch (error) {
      console.error('Error finding broker:', error);
      return null;
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

  /**
   * Detect or create upload session for tracking partial uploads
   */
  public async detectOrCreateSession(
    userId: string,
    filename: string,
    rowCount: number
  ): Promise<UploadSessionInfo> {
    // Generate session ID from filename + userId (NOT timestamp - same file = same session)
    const sessionId = createHash('sha256')
      .update(`${filename}-${userId}`)
      .digest('hex')
      .substring(0, 16);

    // Search last 24h for matching session
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingSessions = await prisma.importBatch.findMany({
      where: {
        userId,
        uploadSessionId: sessionId,
        createdAt: { gte: cutoffDate },
        sessionStatus: { in: ['ACTIVE', 'SUPERSEDED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activeSession = existingSessions.find(s => s.sessionStatus === 'ACTIVE');

    if (activeSession) {
      // Check if row count changed
      if (activeSession.expectedRowCount !== rowCount) {
        console.log(`[Session] Row count changed: ${activeSession.expectedRowCount} → ${rowCount}. Superseding old session.`);

        // Mark old session as SUPERSEDED
        await prisma.importBatch.update({
          where: { id: activeSession.id },
          data: { sessionStatus: 'SUPERSEDED' }
        });

        // Create new session with new row count
        return {
          id: sessionId,
          expectedRowCount: rowCount,
          previousCompleted: 0, // Start fresh count for new session
          isNew: true
        };
      }

      // Same row count - continue existing session
      console.log(`[Session] Continuing existing session. Progress: ${activeSession.completedRowCount}/${activeSession.expectedRowCount}`);
      return {
        id: sessionId,
        expectedRowCount: activeSession.expectedRowCount || rowCount,
        previousCompleted: activeSession.completedRowCount,
        isNew: false
      };
    }

    // No active session - create new
    console.log(`[Session] Creating new session for ${filename} with ${rowCount} expected rows`);
    return {
      id: sessionId,
      expectedRowCount: rowCount,
      previousCompleted: 0,
      isNew: true
    };
  }

  /**
   * Get current session attempt count
   */
  public async getSessionAttemptCount(sessionId: string): Promise<number> {
    const count = await prisma.importBatch.count({
      where: {
        uploadSessionId: sessionId,
        sessionStatus: { in: ['ACTIVE', 'SUPERSEDED'] }
      }
    });
    return count;
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

  private normalizeAssetClass(value: string): string {
    if (!value) return 'EQUITY';
    const normalized = value.toUpperCase().trim();

    switch (normalized) {
      case 'EQUITY':
      case 'STOCK':
      case 'STOCKS':
        return 'EQUITY';
      case 'OPTION':
      case 'OPTIONS':
        return 'OPTIONS';
      case 'FUTURE':
      case 'FUTURES':
        return 'FUTURES';
      case 'FOREX':
      case 'FX':
        return 'FOREX';
      case 'CRYPTO':
      case 'CRYPTOCURRENCY':
        return 'CRYPTO';
      default:
        return 'EQUITY';
    }
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
          } catch (error: unknown) {
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
              const parsedDate = this.parseDateSafely(transformedValue);
              if (!parsedDate) {
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
    
    const placedDate = this.parseDateSafely(normalizedData.orderPlacedTime);
    const executedDate = this.parseDateSafely(normalizedData.orderExecutedTime);

    if (placedDate && executedDate) {
      // We have both times explicitly
      orderPlacedTime = placedDate;
      orderExecutedTime = executedDate;
    } else if (placedDate) {
      // Only have placed time - use it for both
      orderPlacedTime = placedDate;
      orderExecutedTime = placedDate;
    } else if (executedDate) {
      // Only have executed time - check if it's from an execution-specific mapping
      const hasExecutionMapping = Object.entries(format.fieldMappings).some(([csvHeader, mapping]) =>
        mapping.tradeVoyagerField === 'orderExecutedTime' && this.isExecutionSpecificHeader(csvHeader)
      );

      if (hasExecutionMapping) {
        // It's a true execution time, use it for both
        orderExecutedTime = executedDate;
        orderPlacedTime = executedDate; // Assume they're the same unless we have both
      } else {
        // It's probably a general time, use it for both
        orderPlacedTime = executedDate;
        orderExecutedTime = executedDate;
      }
    } else {
      // No valid time data, use current time
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
  
  /**
   * Infer order side (BUY/SELL) from quantity sign when no explicit side indicator exists
   * @param mappedData - The mapped order data
   * @param rawRow - The original CSV row
   * @param fieldMappings - The field mappings used for this format
   * @returns Updated mappedData with inferred side and absolute quantity
   */
  private inferSideFromQuantity(
    mappedData: Record<string, unknown>,
    rawRow: Record<string, unknown>,
    fieldMappings: Record<string, any> | any[]
  ): Record<string, unknown> {
    // Check if side field already exists in mappedData
    if (mappedData.side !== undefined && mappedData.side !== null && mappedData.side !== '') {
      // Side is already present, no need to infer
      return mappedData;
    }

    // Check if any field mapping explicitly maps to 'side'
    const hasSideMapping = Array.isArray(fieldMappings)
      ? fieldMappings.some((m: any) => {
          if ('tradeVoyagerField' in m) {
            return m.tradeVoyagerField === 'side';
          }
          return false;
        })
      : Object.values(fieldMappings).some((mapping: any) => {
          if (typeof mapping === 'object' && mapping !== null) {
            if ('field' in mapping && mapping.field === 'side') return true;
            if ('fields' in mapping && Array.isArray(mapping.fields) && mapping.fields.includes('side')) return true;
          }
          if (typeof mapping === 'string' && mapping === 'side') return true;
          return false;
        });

    // If there's a side mapping but the value is just empty, don't infer
    if (hasSideMapping) {
      return mappedData;
    }

    // No side field exists - infer from quantity
    const quantity = Number(mappedData.orderQuantity) || Number(mappedData.quantity) || 0;

    if (quantity === 0) {
      // No quantity or zero quantity - can't infer, leave as-is
      return mappedData;
    }

    // Infer side from quantity sign
    if (quantity < 0) {
      mappedData.side = 'SELL';
      // Convert quantity to absolute value
      if (mappedData.orderQuantity !== undefined) {
        mappedData.orderQuantity = Math.abs(quantity);
      }
      if (mappedData.quantity !== undefined) {
        mappedData.quantity = Math.abs(quantity);
      }
      console.log(`[Side Inference] Inferred SELL from negative quantity: ${quantity} -> ${Math.abs(quantity)}`);
    } else {
      mappedData.side = 'BUY';
      console.log(`[Side Inference] Inferred BUY from positive quantity: ${quantity}`);
    }

    return mappedData;
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

    // Look up or create Charles Schwab broker to get brokerId
    const broker = await this.brokerFormatService.findOrCreateBroker('Charles Schwab');
    const brokerId = broker.id;

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
            assetClass: 'EQUITY' as any,
            orderType: this.normalizeOrderType(order.orderType || 'Market'),
            side: this.normalizeOrderSide(order.side || 'BUY'),
            timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
            orderQuantity: order.orderQuantity || 0,
            limitPrice: order.limitPrice,
            orderStatus: this.normalizeOrderStatus(order.orderStatus || 'FILLED'),
            orderPlacedTime: order.orderExecutedTime || new Date(),
            orderExecutedTime: order.orderExecutedTime || new Date(),
            brokerType: BrokerType.CHARLES_SCHWAB,
            brokerId, // From Charles Schwab broker
            tags: accountTags,
          },
        });

        successCount++;
      } catch (error: unknown) {
        errorCount++;
        errors.push(`Filled order ${index + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`);
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
            assetClass: 'EQUITY' as any,
            orderType: this.normalizeOrderType(order.orderType || 'Market'),
            side: this.normalizeOrderSide(order.side || 'BUY'),
            timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
            orderQuantity: order.orderQuantity || 0,
            limitPrice: order.limitPrice,
            orderStatus: this.normalizeOrderStatus('WORKING'), // Working orders are PENDING
            orderPlacedTime: order.orderPlacedTime || new Date(),
            brokerType: BrokerType.CHARLES_SCHWAB,
            brokerId, // From Charles Schwab broker
            tags: accountTags,
          },
        });

        successCount++;
      } catch (error: unknown) {
        errorCount++;
        errors.push(`Working order ${index + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`);
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
              assetClass: 'EQUITY' as any,
              orderType: this.normalizeOrderType(order.orderType || 'Market'),
              side: this.normalizeOrderSide(order.side || 'BUY'),
              timeInForce: this.normalizeTimeInForce(order.timeInForce || 'DAY'),
              orderQuantity: order.orderQuantity || 0,
              limitPrice: order.limitPrice,
              orderStatus: this.normalizeOrderStatus(order.orderStatus || 'CANCELLED'),
              orderPlacedTime: order.orderCancelledTime || new Date(),
              orderCancelledTime: order.orderCancelledTime || new Date(),
              brokerType: BrokerType.CHARLES_SCHWAB,
              brokerId, // From Charles Schwab broker
              tags: accountTags,
            },
          });

          successCount++;
        }
      } catch (error: unknown) {
        errorCount++;
        errors.push(`Cancelled order ${index + 1}: ${(error as any) instanceof Error ? (error as Error).message : 'Unknown error'}`);
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