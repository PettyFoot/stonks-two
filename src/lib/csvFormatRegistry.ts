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
  fillPrice: { required: false, type: 'number', description: 'Actual fill price' },
  averagePrice: { required: false, type: 'number', description: 'Average fill price' },
  
  // Costs
  commission: { required: false, type: 'number', description: 'Commission fees' },
  fees: { required: false, type: 'number', description: 'Other trading fees' },
  netAmount: { required: false, type: 'number', description: 'Net transaction amount' },
  
  // Account & metadata
  account: { required: false, type: 'string', description: 'Account identifier' },
  accountNumber: { required: false, type: 'string', description: 'Account number' },
  brokerName: { required: false, type: 'string', description: 'Broker name' },
  
  // Advanced fields
  orderType: { required: false, type: 'string', description: 'Market/Limit/Stop/etc' },
  timeInForce: { required: false, type: 'string', description: 'Day/GTC/IOC/FOK' },
  executionVenue: { required: false, type: 'string', description: 'Exchange/ECN' },
  liquidityFlag: { required: false, type: 'string', description: 'Maker/Taker' },
  
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
    id: 'custom-order-execution',
    name: 'Order Execution Format',
    description: 'Custom order and execution data with routing information',
    fingerprint: 'tradeid|orderid|trader|account|route|bkrsym|bs|qty|price|time',
    confidence: 0.95,
    fieldMappings: {
      'TradeID': { tradeVoyagerField: 'orderId', dataType: 'string', required: true, examples: ['75003', '65006'] },
      'OrderID': { tradeVoyagerField: 'tradeId', dataType: 'string', required: false, examples: ['74769', '64278'] },
      'Trader': { tradeVoyagerField: 'customTag', dataType: 'string', required: false, examples: ['15414'] },
      'Account': { tradeVoyagerField: 'accountNumber', dataType: 'string', required: true, examples: ['15414'] },
      'Branch': { tradeVoyagerField: 'notes', dataType: 'string', required: false, examples: ['STG'] },
      'route': { tradeVoyagerField: 'executionVenue', dataType: 'string', required: false, examples: ['ARCA', 'NASDAQ'] },
      'bkrsym': { tradeVoyagerField: 'exchangeCode', dataType: 'string', required: false, examples: ['ARCX'] },
      'rrno': { tradeVoyagerField: 'strategyTag', dataType: 'string', required: false, examples: [''] },
      'B/S': { tradeVoyagerField: 'side', dataType: 'string', required: true, transformer: 'orderExecutionSideMapping', examples: ['S', 'B'] },
      'SHORT': { tradeVoyagerField: 'liquidityFlag', dataType: 'string', required: false, examples: ['N', 'Y'] },
      'Market': { tradeVoyagerField: 'orderType', dataType: 'string', required: false, transformer: 'orderTypeMapping', examples: ['Lmt', 'Mkt'] },
      'symb': { tradeVoyagerField: 'symbol', dataType: 'string', required: true, examples: ['HOOD', 'AAPL'] },
      'qty': { tradeVoyagerField: 'quantity', dataType: 'number', required: true, examples: ['14', '30'] },
      'price': { tradeVoyagerField: 'price', dataType: 'number', required: false, examples: ['43.23', '42.69'] },
      'time': { tradeVoyagerField: 'date', dataType: 'date', required: true, transformer: 'parseOrderDateTime', examples: ['04/22/25 12:08:30', '04/22/25 10:52:12'] },
    },
    detectionPatterns: {
      headerPattern: ['TradeID', 'OrderID', 'Account', 'B/S', 'qty', 'price'],
      sampleValuePatterns: {
        'B/S': /^(B|S|BUY|SELL)$/i,
        'Market': /^(Lmt|Mkt|STP)$/i,
      },
    },
    brokerName: 'Custom Execution System',
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
  detectFormat(headers: string[], sampleRows: any[]): {
    format: CsvFormat | null;
    confidence: number;
    reasoning: string[];
  } {
    const results = this.formats.map(format => {
      const analysis = this.analyzeFormat(headers, sampleRows, format);
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

  private analyzeFormat(headers: string[], sampleRows: any[], format: CsvFormat): {
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Check required headers
    const requiredHeaders = format.detectionPatterns.headerPattern;
    const headerMatches = requiredHeaders.filter(required => 
      headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
    );
    
    const headerScore = headerMatches.length / requiredHeaders.length;
    score += headerScore * 0.6; // 60% weight for headers
    maxScore += 0.6;
    
    reasoning.push(`Header match: ${headerMatches.length}/${requiredHeaders.length} required headers found`);

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
    sampleRows: any[],
    brokerName?: string
  ): CsvFormat {
    const fieldMappings: CsvFormat['fieldMappings'] = {};
    
    for (const [csvColumn, tradeVoyagerField] of Object.entries(userMappings)) {
      if (tradeVoyagerField && tradeVoyagerField !== 'none') {
        const fieldInfo = TRADE_VOYAGER_FIELDS[tradeVoyagerField as keyof typeof TRADE_VOYAGER_FIELDS];
        const examples = sampleRows.map(row => row[csvColumn]).filter(Boolean).slice(0, 3);
        
        fieldMappings[csvColumn] = {
          tradeVoyagerField,
          dataType: fieldInfo?.type as any || 'string',
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
          let [month, day, year] = dateSegments;
          
          // Convert 2-digit year to 4-digit year
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            year = String(currentCentury + parseInt(year));
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
};