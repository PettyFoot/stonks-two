import { z } from 'zod';

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
  assetClass: { required: false, type: 'string', description: 'Asset class (STOCK/OPTION/etc)' },
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

// Pre-built format registry with common broker formats
export const KNOWN_CSV_FORMATS: CsvFormat[] = [
  {
    id: 'interactive-brokers-flex',
    name: 'Interactive Brokers Flex Query',
    description: 'IBKR Flex Query export format',
    fingerprint: 'date|time|symbol|buysell|quantity|tradeprice|commission',
    confidence: 0.95,
    fieldMappings: {
      'Date': { tradeVoyagerField: 'date', dataType: 'date', required: true, examples: ['2025-01-15', '20250115'] },
      'Time': { tradeVoyagerField: 'time', dataType: 'string', required: false, examples: ['09:30:00', '093000'] },
      'Symbol': { tradeVoyagerField: 'symbol', dataType: 'string', required: true, examples: ['AAPL', 'TSLA'] },
      'Buy/Sell': { tradeVoyagerField: 'side', dataType: 'string', required: true, transformer: 'ibkrSideMapping', examples: ['BOT', 'SLD'] },
      'Quantity': { tradeVoyagerField: 'quantity', dataType: 'number', required: true, examples: ['100', '50'] },
      'T. Price': { tradeVoyagerField: 'price', dataType: 'number', required: false, examples: ['150.25', '25.50'] },
      'Comm/Fee': { tradeVoyagerField: 'commission', dataType: 'number', required: false, examples: ['1.00', '2.50'] },
      'Realized P&L': { tradeVoyagerField: 'realizedPnL', dataType: 'number', required: false, examples: ['125.50', '-50.25'] },
      'Account': { tradeVoyagerField: 'account', dataType: 'string', required: false, examples: ['U1234567', 'DU567890'] },
    },
    detectionPatterns: {
      headerPattern: ['Date', 'Symbol', 'Buy/Sell', 'Quantity'],
      sampleValuePatterns: {
        'Buy/Sell': /^(BOT|SLD|BUY|SELL)$/i,
      },
    },
    brokerName: 'Interactive Brokers',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  
  {
    id: 'td-ameritrade-history',
    name: 'TD Ameritrade Transaction History',
    description: 'TD Ameritrade/Schwab transaction export',
    fingerprint: 'date|time|symbol|side|qty|price|netamt|fees',
    confidence: 0.95,
    fieldMappings: {
      'DATE': { tradeVoyagerField: 'date', dataType: 'date', required: true, examples: ['01/15/2025', '1/15/25'] },
      'TIME': { tradeVoyagerField: 'time', dataType: 'string', required: false, examples: ['09:30:00 AM', '9:30 AM'] },
      'SYMBOL': { tradeVoyagerField: 'symbol', dataType: 'string', required: true, examples: ['AAPL', 'TSLA'] },
      'SIDE': { tradeVoyagerField: 'side', dataType: 'string', required: true, transformer: 'standardSideMapping', examples: ['BUY', 'SELL'] },
      'QTY': { tradeVoyagerField: 'quantity', dataType: 'number', required: true, examples: ['100', '50'] },
      'PRICE': { tradeVoyagerField: 'price', dataType: 'number', required: false, transformer: 'removeCurrency', examples: ['$150.25', '$25.50'] },
      'NET AMT': { tradeVoyagerField: 'netAmount', dataType: 'number', required: false, transformer: 'removeCurrency', examples: ['-$15,026.00', '$2,550.00'] },
      'FEES': { tradeVoyagerField: 'commission', dataType: 'number', required: false, transformer: 'removeCurrency', examples: ['$1.00', '$0.00'] },
      'ACCOUNT': { tradeVoyagerField: 'account', dataType: 'string', required: false, examples: ['123456789', '987654321'] },
    },
    detectionPatterns: {
      headerPattern: ['DATE', 'SYMBOL', 'SIDE', 'QTY'],
      sampleValuePatterns: {
        'SIDE': /^(BUY|SELL|B|S)$/i,
        'PRICE': /^\$?[\d,]+\.?\d*$/,
      },
    },
    brokerName: 'TD Ameritrade',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  
  {
    id: 'etrade-transactions',
    name: 'E*TRADE Transaction Export',
    description: 'E*TRADE transaction history format',
    fingerprint: 'transactiondate|symbol|action|quantity|price|amount',
    confidence: 0.9,
    fieldMappings: {
      'TransactionDate': { tradeVoyagerField: 'date', dataType: 'date', required: true, examples: ['01/15/2025', '1/15/25'] },
      'TransactionTime': { tradeVoyagerField: 'time', dataType: 'string', required: false, examples: ['9:30:00 AM', '09:30'] },
      'Symbol': { tradeVoyagerField: 'symbol', dataType: 'string', required: true, examples: ['AAPL', 'TSLA'] },
      'Action': { tradeVoyagerField: 'side', dataType: 'string', required: true, transformer: 'standardSideMapping', examples: ['Buy', 'Sell'] },
      'Quantity': { tradeVoyagerField: 'quantity', dataType: 'number', required: true, examples: ['100', '50'] },
      'Price': { tradeVoyagerField: 'price', dataType: 'number', required: false, examples: ['150.25', '25.50'] },
      'Amount': { tradeVoyagerField: 'netAmount', dataType: 'number', required: false, examples: ['15025.00', '2550.00'] },
      'Commission': { tradeVoyagerField: 'commission', dataType: 'number', required: false, examples: ['0.00', '4.95'] },
      'AccountNumber': { tradeVoyagerField: 'account', dataType: 'string', required: false, examples: ['12345-6789', '98765-4321'] },
    },
    detectionPatterns: {
      headerPattern: ['TransactionDate', 'Symbol', 'Action', 'Quantity'],
      sampleValuePatterns: {
        'Action': /^(Buy|Sell|Short|Cover)$/i,
      },
    },
    brokerName: 'E*TRADE',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  
  {
    id: 'trade-voyager-orders',
    name: 'Trade Voyager Orders Format',
    description: 'Trade Voyager order execution data with account and routing information',
    fingerprint: 'tradeid|orderid|trader|account|branch|route|bkrsym|bs|qty|price|time',
    confidence: 0.95,
    fieldMappings: {
      'TradeID': { tradeVoyagerField: 'orderId', dataType: 'string', required: true, examples: ['75003', '65006', '70039'] },
      'OrderID': { tradeVoyagerField: 'parentOrderId', dataType: 'string', required: false, examples: ['74769', '64278', '69437'] },
      'Trader': { tradeVoyagerField: 'accountId', dataType: 'string', required: false, examples: ['15414'] },
      'Account': { tradeVoyagerField: 'orderAccount', dataType: 'string', required: true, examples: ['15414'] },
      'Branch': { tradeVoyagerField: 'tags', dataType: 'string', required: false, examples: ['STG'] },
      'route': { tradeVoyagerField: 'orderRoute', dataType: 'string', required: false, examples: ['ARCA', 'NASDAQ'] },
      'bkrsym': { tradeVoyagerField: 'notes', dataType: 'string', required: false, examples: ['ARCX'] },
      'rrno': { tradeVoyagerField: 'notes', dataType: 'string', required: false, examples: [''] },
      'B/S': { tradeVoyagerField: 'side', dataType: 'string', required: true, transformer: 'orderExecutionSideMapping', examples: ['S', 'B'] },
      'SHORT': { tradeVoyagerField: 'notes', dataType: 'string', required: false, examples: ['N', 'Y'] },
      'Market': { tradeVoyagerField: 'orderType', dataType: 'string', required: false, transformer: 'orderTypeMapping', examples: ['Lmt', 'Mkt'] },
      'symb': { tradeVoyagerField: 'symbol', dataType: 'string', required: true, examples: ['HOOD', 'AAPL'] },
      'qty': { tradeVoyagerField: 'orderQuantity', dataType: 'number', required: true, examples: ['14', '30', '29'] },
      'price': { tradeVoyagerField: 'limitPrice', dataType: 'number', required: false, examples: ['43.23', '42.69', '42.89'] },
      'time': { tradeVoyagerField: 'orderExecutedTime', dataType: 'date', required: true, transformer: 'parseOrderDateTime', examples: ['04/22/25 12:08:30', '04/22/25 10:52:12', '04/22/25 11:25:24'] },
    },
    detectionPatterns: {
      headerPattern: ['TradeID', 'OrderID', 'Account', 'B/S', 'qty', 'price', 'time'],
      sampleValuePatterns: {
        'B/S': /^(B|S|BUY|SELL)$/i,
        'Market': /^(Lmt|Mkt|STP)$/i,
        'time': /^\d{2}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}$/,
      },
    },
    brokerName: 'Trade Voyager',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  
  {
    id: 'schwab-todays-trades',
    name: 'Schwab Today\'s Trade Activity',
    description: 'Charles Schwab Today\'s Trade Activity export format',
    fingerprint: 'timeplaced|exectime|timecanceled|spread|side|qty|symbol|price|orderstatus',
    confidence: 0.95,
    fieldMappings: {
      'Time Placed': { 
        tradeVoyagerField: 'orderPlacedTime', 
        dataType: 'date', 
        required: false, 
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 10:15:02'] 
      },
      'Exec Time': { 
        tradeVoyagerField: 'orderExecutedTime', 
        dataType: 'date', 
        required: false,
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 09:31:36'] 
      },
      'Time Canceled': { 
        tradeVoyagerField: 'orderCancelledTime', 
        dataType: 'date', 
        required: false,
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 09:33:45'] 
      },
      'Spread': { 
        tradeVoyagerField: 'assetClass', 
        dataType: 'string', 
        required: false, 
        examples: ['STOCK', 'OPTION'] 
      },
      'Side': { 
        tradeVoyagerField: 'side', 
        dataType: 'string', 
        required: true,
        transformer: 'schwabSideMapping',
        examples: ['BUY', 'SELL'] 
      },
      'Qty': { 
        tradeVoyagerField: 'orderQuantity', 
        dataType: 'number', 
        required: true,
        transformer: 'parseAbsoluteQuantity',
        examples: ['+100', '-25'] 
      },
      'Pos Effect': { 
        tradeVoyagerField: 'positionEffect', 
        dataType: 'string', 
        required: false, 
        examples: ['TO OPEN', 'TO CLOSE'] 
      },
      'Symbol': { 
        tradeVoyagerField: 'symbol', 
        dataType: 'string', 
        required: true, 
        examples: ['ABC', 'OCTO'] 
      },
      'Exp': { 
        tradeVoyagerField: 'expirationDate', 
        dataType: 'string', 
        required: false, 
        examples: ['12/20/24'] 
      },
      'Strike': { 
        tradeVoyagerField: 'strikePrice', 
        dataType: 'number', 
        required: false, 
        examples: ['150', '25.50'] 
      },
      'Type': { 
        tradeVoyagerField: 'optionType', 
        dataType: 'string', 
        required: false, 
        examples: ['STOCK', 'CALL', 'PUT'] 
      },
      'Price': { 
        tradeVoyagerField: 'limitPrice', 
        dataType: 'number', 
        required: false,
        transformer: 'parseSchwabPrice',
        examples: ['4.29', '~'] 
      },
      'PRICE': { 
        tradeVoyagerField: 'limitPrice', 
        dataType: 'number', 
        required: false,
        transformer: 'parseSchwabPrice',
        examples: ['4.50', '~'] 
      },
      'Net Price': { 
        tradeVoyagerField: 'fillPrice', 
        dataType: 'number', 
        required: false, 
        examples: ['4.29', '4.33'] 
      },
      'Order Type': { 
        tradeVoyagerField: 'orderType', 
        dataType: 'string', 
        required: false,
        transformer: 'schwabOrderTypeMapping',
        examples: ['LMT', 'STP', 'MKT'] 
      },
      'TIF': { 
        tradeVoyagerField: 'timeInForce', 
        dataType: 'string', 
        required: false, 
        examples: ['DAY', 'GTC'] 
      },
      'Status': { 
        tradeVoyagerField: 'orderStatus', 
        dataType: 'string', 
        required: false, 
        examples: ['OPEN', 'CANCELED', 'WORKING', 'FILLED'] 
      },
      'Notes': { 
        tradeVoyagerField: 'orderNotes', 
        dataType: 'string', 
        required: false, 
        examples: [''] 
      }
    },
    detectionPatterns: {
      headerPattern: ['Spread', 'Side', 'Qty', 'Symbol'],
      sampleValuePatterns: {
        'Side': /^(BUY|SELL)$/i,
        'Qty': /^[+\-]?\d+$/,
        'Pos Effect': /^TO (OPEN|CLOSE)$/i,
        'TIF': /^(DAY|GTC|IOC|FOK)$/i,
        'Spread': /^(STOCK|OPTION)$/i,
      },
      fileNamePatterns: [
        /schwab.*trade.*activity/i,
        /todays.*trade.*activity/i,
        /trade.*activity.*\d{1,2}\/\d{1,2}\/\d{2,4}/i
      ],
      // Special detection for Schwab format - look for the header line pattern
      specialDetection: {
        fileStartPattern: /Today's Trade Activity for \d+\w*\s+.*on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i,
        sectionHeaders: ['Working Orders', 'Filled Orders', 'Canceled Orders']
      }
    },
    brokerName: 'Charles Schwab',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  }
];

// CSV Format Detection Engine
export class CsvFormatDetector {
  private formats: CsvFormat[] = [...KNOWN_CSV_FORMATS];

  // Detect CSV format from headers and sample data
  detectFormat(headers: string[], sampleRows: Record<string, unknown>[], fileContent?: string): {
    format: CsvFormat | null;
    confidence: number;
    reasoning: string[];
  } {
    const results = this.formats.map(format => {
      const analysis = this.analyzeFormat(headers, sampleRows, format, fileContent);
      return { format, ...analysis };
    });

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    const best = results[0];
    
    if (best.confidence >= 0.7) {
      return {
        format: best.format,
        confidence: best.confidence,
        reasoning: best.reasoning
      };
    }

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
    } catch (error) {
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
    } catch (error) {
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
};