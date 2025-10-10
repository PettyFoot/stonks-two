
// CSV Format Registry - Database of known CSV formats and their mappings
export interface CsvFormat {
  id: string;
  name: string;
  description: string;
  fingerprint: string; // Unique identifier based on column structure
  confidence: number; // 0-1 confidence score
  
  // Column mappings to Trade Voyager standard fields
  fieldMappings: {
    [csvColumn: string]: {
      tradeVoyagerField: string;
      dataType: 'string' | 'number' | 'date' | 'boolean';
      required: boolean;
      transformer?: string; // Name of transformation function
      examples: string[];
    };
  };
  
  // Detection patterns
  detectionPatterns: {
    headerPattern: string[]; // Required headers for detection
    sampleValuePatterns?: { [column: string]: RegExp }; // Value patterns for verification
    fileNamePatterns?: RegExp[]; // Common filename patterns
    specialDetection?: {
      fileStartPattern?: RegExp;
      sectionHeaders?: string[];
    };
  };
  
  // Metadata
  brokerName?: string;
  version?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  createdBy?: string; // User who created this format
}

// Trade Voyager standard fields that CSV data can map to
export const TRADE_VOYAGER_FIELDS = {
  // Core identification
  tradeId: { required: false, type: 'string', description: 'Unique trade/execution ID' },
  orderId: { required: false, type: 'string', description: 'Parent order ID' },
  symbol: { required: true, type: 'string', description: 'Stock ticker symbol' },
  
  // Basic trade info
  date: { required: true, type: 'date', description: 'Trade execution date' },
  time: { required: false, type: 'string', description: 'Trade execution time' },
  side: { required: true, type: 'string', description: 'Buy/Sell/Short/Cover' },
  quantity: { required: true, type: 'number', description: 'Number of shares' },
  
  // Pricing
  price: { required: false, type: 'number', description: 'Execution price per share' },
  averagePrice: { required: false, type: 'number', description: 'Average fill price' },
  
  // Costs
  commission: { required: false, type: 'number', description: 'Commission fees' },
  fees: { required: false, type: 'number', description: 'Other trading fees' },
  netAmount: { required: false, type: 'number', description: 'Net transaction amount' },
  
  // Account & metadata
  account: { required: false, type: 'string', description: 'Account identifier' },
  accountNumber: { required: false, type: 'string', description: 'Account number' },
  orderAccount: { required: false, type: 'string', description: 'Order account identifier' },
  orderRoute: { required: false, type: 'string', description: 'Order routing venue' },
  brokerName: { required: false, type: 'string', description: 'Broker name' },
  
  // Advanced fields
  orderType: { required: false, type: 'string', description: 'Market/Limit/Stop/etc' },
  orderQuantity: { required: false, type: 'number', description: 'Total order quantity' },
  limitPrice: { required: false, type: 'number', description: 'Order limit price' },
  orderPlaceTime: { required: false, type: 'date', description: 'Order placement timestamp' },
  orderPlacedTime: { required: false, type: 'date', description: 'Order placed timestamp' },
  orderExecutedTime: { required: false, type: 'date', description: 'Order executed timestamp' },
  orderCancelledTime: { required: false, type: 'date', description: 'Order cancelled timestamp' },
  timeInForce: { required: false, type: 'string', description: 'Day/GTC/IOC/FOK' },
  executionVenue: { required: false, type: 'string', description: 'Exchange/ECN' },
  liquidityFlag: { required: false, type: 'string', description: 'Maker/Taker' },
  orderStatus: { required: false, type: 'string', description: 'Order status (WORKING/FILLED/CANCELLED)' },
  orderNotes: { required: false, type: 'string', description: 'Order notes and status details' },
  assetClass: { required: false, type: 'string', description: 'Asset class (EQUITY/OPTIONS/FUTURES/FOREX/CRYPTO)' },
  positionEffect: { required: false, type: 'string', description: 'Position effect (TO OPEN/TO CLOSE)' },
  fillPrice: { required: false, type: 'number', description: 'Actual fill price' },
  expirationDate: { required: false, type: 'string', description: 'Option expiration date' },
  strikePrice: { required: false, type: 'number', description: 'Option strike price' },
  optionType: { required: false, type: 'string', description: 'Option type (CALL/PUT)' },
  
  // P&L and performance
  realizedPnL: { required: false, type: 'number', description: 'Realized profit/loss' },
  unrealizedPnL: { required: false, type: 'number', description: 'Unrealized profit/loss' },
  totalPnL: { required: false, type: 'number', description: 'Total profit/loss' },
  
  // Position tracking
  openQuantity: { required: false, type: 'number', description: 'Open position quantity' },
  closeQuantity: { required: false, type: 'number', description: 'Closing quantity' },
  remainingQuantity: { required: false, type: 'number', description: 'Remaining quantity' },
  
  // Market data
  bidPrice: { required: false, type: 'number', description: 'Bid price at execution' },
  askPrice: { required: false, type: 'number', description: 'Ask price at execution' },
  lastPrice: { required: false, type: 'number', description: 'Last traded price' },
  
  // Custom fields
  notes: { required: false, type: 'string', description: 'Trade notes' },
  tags: { required: false, type: 'string', description: 'Comma-separated tags' },
  strategy: { required: false, type: 'string', description: 'Trading strategy' },
} as const;

// Note: CSV formats are now stored in the database via broker_csv_formats table
// This registry now serves as the interface for loading formats dynamically

// CSV Format Detection Engine
export class CsvFormatDetector {
  private formats: CsvFormat[] = [];

  constructor(formats: CsvFormat[] = []) {
    this.formats = formats;
  }

  // Detect CSV format from headers and sample data
  detectFormat(headers: string[], sampleRows: Record<string, unknown>[], fileContent?: string): {
    format: CsvFormat | null;
    confidence: number;
    reasoning: string[];
  } {
    console.log('[CsvFormatDetector] Analyzing', this.formats.length, 'formats against uploaded file');
    console.log('[CsvFormatDetector] Uploaded headers:', headers.length, '-', headers.join(', '));

    const results = this.formats.map(format => {
      const analysis = this.analyzeFormat(headers, sampleRows, format, fileContent);
      return { format, ...analysis };
    });

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    // Log top 3 results
    console.log('[CsvFormatDetector] Top matches:');
    results.slice(0, 3).forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.format.name} - Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      result.reasoning.forEach(r => console.log(`     ${r}`));
    });

    const best = results[0];

    if (best.confidence >= 0.7) {
      console.log(`[CsvFormatDetector] ✅ Match found: ${best.format.name} (${(best.confidence * 100).toFixed(1)}%)`);
      return {
        format: best.format,
        confidence: best.confidence,
        reasoning: best.reasoning
      };
    }

    console.log('[CsvFormatDetector] ❌ No format matched (threshold: 70%)');
    return {
      format: null,
      confidence: 0,
      reasoning: ['No known CSV format detected with sufficient confidence']
    };
  }

  private analyzeFormat(headers: string[], sampleRows: Record<string, unknown>[], format: CsvFormat, fileContent?: string): {
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Special handling for Schwab format
    if (format.id === 'schwab-todays-trades' && fileContent) {
      const specialDetection = format.detectionPatterns.specialDetection;
      if (specialDetection?.fileStartPattern) {
        const fileStartMatch = specialDetection.fileStartPattern.test(fileContent);
        if (fileStartMatch) {
          score += 0.8; // High confidence for file start pattern match
          maxScore += 0.8;
          reasoning.push('Detected Schwab "Today\'s Trade Activity" file header pattern');
        }
      }
      
      if (specialDetection?.sectionHeaders) {
        const sectionMatches = specialDetection.sectionHeaders.filter((section: string) => 
          fileContent.includes(section)
        ).length;
        if (sectionMatches > 0) {
          score += 0.2 * (sectionMatches / specialDetection.sectionHeaders.length);
          maxScore += 0.2;
          reasoning.push(`Found ${sectionMatches}/${specialDetection.sectionHeaders.length} expected sections`);
        }
      }
    } else {
      // Regular header matching for other formats
      const requiredHeaders = format.detectionPatterns.headerPattern;
      const headerMatches = requiredHeaders.filter(required =>
        headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
      );

      // CRITICAL CHECK: Reject if uploaded file has too many extra unmapped columns
      // This prevents matching when user has added new columns that need AI mapping
      const mappableHeaders = Object.keys(format.fieldMappings).length;
      const uploadedHeaderCount = headers.length;
      const unmappedColumnCount = uploadedHeaderCount - mappableHeaders;

      if (unmappedColumnCount > 2) {
        // File has >2 extra unmapped columns - reject this format entirely
        // This should trigger AI mapping for new format creation
        score = 0;
        maxScore = 1;
        reasoning.push(`❌ Rejected: Uploaded file has ${uploadedHeaderCount} columns but format only maps ${mappableHeaders} (${unmappedColumnCount} unmapped columns)`);
        return { confidence: 0, reasoning };
      }

      const headerScore = headerMatches.length / requiredHeaders.length;
      score += headerScore * 0.6; // 60% weight for headers
      maxScore += 0.6;

      reasoning.push(`Header match: ${headerMatches.length}/${requiredHeaders.length} required headers found`);
    }

    // Check sample value patterns
    if (format.detectionPatterns.sampleValuePatterns && sampleRows.length > 0) {
      let patternMatches = 0;
      let totalPatterns = 0;

      for (const [column, pattern] of Object.entries(format.detectionPatterns.sampleValuePatterns)) {
        totalPatterns++;
        const columnValues = sampleRows.map(row => row[column]).filter(Boolean);
        
        if (columnValues.length > 0) {
          const matches = columnValues.filter(value => pattern.test(String(value))).length;
          const patternScore = matches / columnValues.length;
          
          if (patternScore >= 0.8) {
            patternMatches++;
            reasoning.push(`Pattern match for ${column}: ${matches}/${columnValues.length} values match expected pattern`);
          }
        }
      }

      if (totalPatterns > 0) {
        const patternScore = patternMatches / totalPatterns;
        score += patternScore * 0.3; // 30% weight for patterns
        maxScore += 0.3;
      }
    }

    // Bonus for exact header matches
    const exactMatches = headers.filter(header => 
      Object.keys(format.fieldMappings).includes(header)
    ).length;
    
    const exactScore = exactMatches / Object.keys(format.fieldMappings).length;
    score += exactScore * 0.1; // 10% weight for exact matches
    maxScore += 0.1;
    
    reasoning.push(`Exact header matches: ${exactMatches}/${Object.keys(format.fieldMappings).length}`);

    const confidence = maxScore > 0 ? score / maxScore : 0;
    
    return { confidence, reasoning };
  }

  // Add a new format to the registry
  addFormat(format: CsvFormat): void {
    this.formats.push(format);
  }

  // Get all known formats
  getFormats(): CsvFormat[] {
    return [...this.formats];
  }

  // Create format from user mapping
  createFormatFromMapping(
    name: string,
    headers: string[],
    userMappings: { [csvColumn: string]: string },
    sampleRows: Record<string, unknown>[],
    brokerName?: string
  ): CsvFormat {
    const fieldMappings: CsvFormat['fieldMappings'] = {};
    
    for (const [csvColumn, tradeVoyagerField] of Object.entries(userMappings)) {
      if (tradeVoyagerField && tradeVoyagerField !== 'none') {
        const fieldInfo = TRADE_VOYAGER_FIELDS[tradeVoyagerField as keyof typeof TRADE_VOYAGER_FIELDS];
        const examples = sampleRows.map(row => row[csvColumn]).filter(Boolean).slice(0, 3).map(ex => String(ex));
        
        fieldMappings[csvColumn] = {
          tradeVoyagerField,
          dataType: (fieldInfo?.type as 'string' | 'number' | 'date' | 'boolean') || 'string',
          required: fieldInfo?.required || false,
          examples
        };
      }
    }

    const fingerprint = Object.keys(fieldMappings).sort().join('|').toLowerCase();
    
    return {
      id: `custom-${Date.now()}`,
      name,
      description: `User-created format for ${brokerName || 'custom broker'}`,
      fingerprint,
      confidence: 1.0,
      fieldMappings,
      detectionPatterns: {
        headerPattern: Object.keys(fieldMappings).filter(col => 
          fieldMappings[col].required
        ),
      },
      brokerName,
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 1,
    };
  }
}

// Data transformation functions
export const DATA_TRANSFORMERS = {
  ibkrSideMapping: (value: string) => {
    const mapping: { [key: string]: string } = {
      'BOT': 'BUY',
      'SLD': 'SELL',
      'BUY': 'BUY',
      'SELL': 'SELL'
    };
    return mapping[value.toUpperCase()] || value;
  },
  
  standardSideMapping: (value: string) => {
    const mapping: { [key: string]: string } = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'B': 'BUY',
      'S': 'SELL',
      'Buy': 'BUY',
      'Sell': 'SELL',
      'SHORT': 'SHORT',
      'COVER': 'COVER'
    };
    return mapping[value] || value.toUpperCase();
  },
  
  removeCurrency: (value: string) => {
    return parseFloat(value.replace(/[$,]/g, ''));
  },
  
  parseDate: (value: string) => {
    // Handle multiple date formats
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },
  
  orderExecutionSideMapping: (value: string) => {
    const mapping: { [key: string]: string } = {
      'B': 'BUY',
      'S': 'SELL',
      'BUY': 'BUY',
      'SELL': 'SELL'
    };
    return mapping[value.toUpperCase()] || value.toUpperCase();
  },
  
  orderTypeMapping: (value: string) => {
    const mapping: { [key: string]: string } = {
      'Lmt': 'LIMIT',
      'Mkt': 'MARKET',
      'STP': 'STOP',
      'Limit': 'LIMIT',
      'Market': 'MARKET',
      'Stop': 'STOP'
    };
    return mapping[value] || value.toUpperCase();
  },
  
  parseOrderDateTime: (value: string) => {
    // Handle format like "04/22/25 12:08:30"
    try {
      // Convert MM/DD/YY to MM/DD/YYYY format
      const parts = value.split(' ');
      if (parts.length === 2) {
        const datePart = parts[0];
        const timePart = parts[1];
        const dateSegments = datePart.split('/');
        
        if (dateSegments.length === 3) {
          const [month, day, year] = dateSegments;
          
          // Convert 2-digit year to 4-digit year
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            const fullYear = String(currentCentury + parseInt(year));
            dateSegments[2] = fullYear;
          }
          
          const fullDateTime = `${month}/${day}/${year} ${timePart}`;
          const date = new Date(fullDateTime);
          return isNaN(date.getTime()) ? new Date() : date;
        }
      }
      
      // Fallback to default parsing
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  },
  
  parseSchwabDateTime: (value: string) => {
    // Handle Schwab format like "9/25/24 10:15:02"
    if (!value) return null;
    
    try {
      const [datePart, timePart] = value.split(' ');
      if (!datePart) return null;
      
      const [month, day, year] = datePart.split('/');
      if (!month || !day || !year) return null;
      
      // Convert 2-digit year to 4-digit year
      const fullYear = year.length === 2 ? '20' + year : year;
      
      let isoString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      if (timePart) {
        isoString += `T${timePart}`;
      } else {
        isoString += 'T00:00:00';
      }
      
      return new Date(isoString);
    } catch {
      return null;
    }
  },
  
  schwabSideMapping: (value: string) => {
    if (!value) return null;
    const upperSide = value.toUpperCase();
    if (upperSide === 'BUY' || upperSide === 'B') return 'BUY';
    if (upperSide === 'SELL' || upperSide === 'S') return 'SELL';
    return upperSide;
  },
  
  parseAbsoluteQuantity: (value: string) => {
    if (!value) return 0;
    // Remove +/- signs and convert to absolute value
    const cleanQty = value.toString().replace(/[+\-]/g, '');
    return Math.abs(parseFloat(cleanQty)) || 0;
  },
  
  parseSchwabPrice: (value: string) => {
    if (!value || value === '~') return null;
    return parseFloat(value) || null;
  },
  
  schwabOrderTypeMapping: (value: string) => {
    if (!value) return 'Market';
    const typeMap: { [key: string]: string } = {
      'MKT': 'Market',
      'LMT': 'Limit',
      'STP': 'Stop',
      'MARKET': 'Market',
      'LIMIT': 'Limit',
      'STOP': 'Stop'
    };
    return typeMap[value.toUpperCase()] || value;
  },
  
  // Interactive Brokers specific transformers
  parseIBDateTime: (value: string) => {
    if (!value) return null;
    try {
      // Handle IBKR datetime formats like "20250115;093000" or "2025-01-15 09:30:00"
      if (value.includes(';')) {
        const [datePart, timePart] = value.split(';');
        if (datePart.length === 8 && timePart.length === 6) {
          const year = datePart.substring(0, 4);
          const month = datePart.substring(4, 6);
          const day = datePart.substring(6, 8);
          const hour = timePart.substring(0, 2);
          const minute = timePart.substring(2, 4);
          const second = timePart.substring(4, 6);
          
          return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        }
      }
      
      // Standard datetime formats
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  },
  
  parseIBDate: (value: string) => {
    if (!value) return null;
    try {
      // Handle IBKR date formats like "20250115" or "2025-01-15"
      if (value.length === 8 && /^\d{8}$/.test(value)) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        return new Date(`${year}-${month}-${day}`);
      }
      
      // Standard date formats
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  },
  
  ibOrderTypeMapping: (value: string) => {
    if (!value) return 'MARKET';
    const typeMap: { [key: string]: string } = {
      'MKT': 'MARKET',
      'LMT': 'LIMIT',
      'STP': 'STOP',
      'MARKET': 'MARKET',
      'LIMIT': 'LIMIT',
      'STOP': 'STOP',
      'STOP LIMIT': 'STOP_LIMIT',
      'TRAIL': 'TRAILING_STOP',
      'MOC': 'MARKET_ON_CLOSE',
      'LOC': 'LIMIT_ON_CLOSE'
    };
    return typeMap[value.toUpperCase()] || 'MARKET';
  },
  
  parseMultiplier: (value: string) => {
    if (!value) return 1;
    const num = parseFloat(value);
    return isNaN(num) ? 1 : num;
  },
  
  parseIBCommission: (value: string) => {
    if (!value) return null;
    // Remove currency symbols and parse as number
    const cleaned = value.toString().replace(/[$€£¥]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.abs(num); // Commission should be positive
  },
};