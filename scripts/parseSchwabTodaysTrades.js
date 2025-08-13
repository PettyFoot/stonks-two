const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Schwab "Today's Trade Activity" CSV Format Definition
const SCHWAB_TODAYS_TRADES_FORMAT = {
  id: 'schwab-todays-trades',
  name: 'Schwab Today\'s Trade Activity',
  description: 'Charles Schwab Today\'s Trade Activity export format',
  fingerprint: 'timeplaced|exectime|timecanceled|spread|side|qty|symbol|price|orderstatus',
  confidence: 0.95,
  brokerName: 'Charles Schwab',
  version: '1.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  usageCount: 0,
};

// Parse Schwab CSV format
function parseSchwabTodaysTrades(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  const result = {
    workingOrders: [],
    filledOrders: [],
    cancelledOrders: [],
    metadata: null,
    errors: []
  };

  // Extract metadata from header
  const headerMatch = lines[0].match(/Today's Trade Activity for (\S+)\s+.*on\s+(.+)/);
  if (headerMatch) {
    result.metadata = {
      accountNumber: headerMatch[1],
      reportDate: headerMatch[2]
    };
  }

  let currentSection = null;
  let sectionHeaders = null;
  let skipNext = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line || line === '') continue;

    // Skip the "Rolling Strategies" section and everything after
    if (line.startsWith('Rolling Strategies')) {
      break;
    }

    // Detect section headers
    if (line === 'Working Orders') {
      currentSection = 'working';
      skipNext = true;
      continue;
    } else if (line === 'Filled Orders') {
      currentSection = 'filled';
      skipNext = true;
      continue;
    } else if (line === 'Canceled Orders') {
      currentSection = 'cancelled';
      skipNext = true;
      continue;
    }

    // Parse headers for the current section
    if (skipNext) {
      sectionHeaders = parseCSVLine(line);
      skipNext = false;
      continue;
    }

    // Parse data rows
    if (currentSection && sectionHeaders) {
      try {
        const values = parseCSVLine(line);
        if (values.length > 0 && values.some(v => v !== '')) {
          const rowData = {};
          sectionHeaders.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          const normalizedOrder = normalizeSchwabOrder(rowData, currentSection);
          
          if (currentSection === 'working') {
            result.workingOrders.push(normalizedOrder);
          } else if (currentSection === 'filled') {
            result.filledOrders.push(normalizedOrder);
          } else if (currentSection === 'cancelled') {
            result.cancelledOrders.push(normalizedOrder);
          }
        }
      } catch (error) {
        result.errors.push(`Error parsing row ${i}: ${error.message}`);
      }
    }
  }

  return result;
}

// Parse a CSV line respecting quotes
function parseCSVLine(line) {
  try {
    const parsed = parse(line, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });
    return parsed[0] || [];
  } catch (error) {
    // Fallback to simple split if parse fails
    return line.split(',').map(v => v.trim());
  }
}

// Normalize Schwab order data to Trade Voyager format
function normalizeSchwabOrder(rowData, orderSection) {
  const normalized = {};

  // Determine order status based on section
  if (orderSection === 'working') {
    normalized.orderStatus = 'WORKING';
  } else if (orderSection === 'filled') {
    normalized.orderStatus = 'FILLED';
  } else if (orderSection === 'cancelled') {
    normalized.orderStatus = 'CANCELLED';
  }

  // Map time fields
  if (rowData['Time Placed']) {
    normalized.orderPlacedTime = parseDateTime(rowData['Time Placed']);
  }
  if (rowData['Exec Time']) {
    normalized.orderExecutedTime = parseDateTime(rowData['Exec Time']);
  }
  if (rowData['Time Canceled']) {
    normalized.orderCancelledTime = parseDateTime(rowData['Time Canceled']);
  }

  // Map common fields
  normalized.assetClass = rowData['Spread'] || 'STOCK';
  normalized.side = normalizeSide(rowData['Side']);
  normalized.orderQuantity = parseQuantity(rowData['Qty']);
  normalized.symbol = rowData['Symbol'] || rowData['symb'] || '';
  
  // Map price fields
  if (rowData['Price'] && rowData['Price'] !== '~') {
    normalized.limitPrice = parseFloat(rowData['Price']) || null;
  } else if (rowData['PRICE'] && rowData['PRICE'] !== '~') {
    normalized.limitPrice = parseFloat(rowData['PRICE']) || null;
  }
  
  if (rowData['Net Price']) {
    normalized.fillPrice = parseFloat(rowData['Net Price']) || null;
  }

  // Map order type
  if (rowData['Order Type']) {
    normalized.orderType = normalizeOrderType(rowData['Order Type']);
  } else if (rowData['PRICE'] === '~') {
    normalized.orderType = 'Market';
  } else {
    normalized.orderType = 'Limit';
  }

  // Map time in force
  normalized.timeInForce = rowData['TIF'] || 'DAY';

  // Map position effect
  normalized.positionEffect = rowData['Pos Effect'] || null;

  // Map status/notes
  if (rowData['Status']) {
    normalized.orderNotes = rowData['Status'];
  }
  if (rowData['Notes']) {
    if (normalized.orderNotes) {
      normalized.orderNotes += ' | ' + rowData['Notes'];
    } else {
      normalized.orderNotes = rowData['Notes'];
    }
  }

  // Add option-specific fields if applicable
  if (rowData['Exp']) {
    normalized.expirationDate = rowData['Exp'];
  }
  if (rowData['Strike']) {
    normalized.strikePrice = parseFloat(rowData['Strike']) || null;
  }
  if (rowData['Type'] && rowData['Type'] !== 'STOCK') {
    normalized.optionType = rowData['Type'];
  }

  return normalized;
}

// Parse datetime in format "9/25/24 10:15:02"
function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  
  try {
    // Parse MM/DD/YY HH:MM:SS format
    const [datePart, timePart] = dateTimeStr.split(' ');
    if (!datePart) return null;
    
    const [month, day, year] = datePart.split('/');
    if (!month || !day || !year) return null;
    
    // Convert 2-digit year to 4-digit
    const fullYear = year.length === 2 ? '20' + year : year;
    
    let isoString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    if (timePart) {
      isoString += `T${timePart}`;
    } else {
      isoString += 'T00:00:00';
    }
    
    return new Date(isoString);
  } catch (error) {
    console.error('Error parsing datetime:', dateTimeStr, error);
    return null;
  }
}

// Normalize side (BUY/SELL)
function normalizeSide(side) {
  if (!side) return null;
  
  const upperSide = side.toUpperCase();
  if (upperSide === 'BUY' || upperSide === 'B') return 'BUY';
  if (upperSide === 'SELL' || upperSide === 'S') return 'SELL';
  return upperSide;
}

// Parse quantity (remove +/- signs)
function parseQuantity(qty) {
  if (!qty) return 0;
  
  const cleanQty = qty.toString().replace(/[+\-]/g, '');
  return Math.abs(parseFloat(cleanQty)) || 0;
}

// Normalize order type
function normalizeOrderType(orderType) {
  if (!orderType) return 'Market';
  
  const typeMap = {
    'MKT': 'Market',
    'LMT': 'Limit',
    'STP': 'Stop',
    'MARKET': 'Market',
    'LIMIT': 'Limit',
    'STOP': 'Stop'
  };
  
  return typeMap[orderType.toUpperCase()] || orderType;
}

// Create the format definition for the CSV registry
function createSchwabFormatDefinition() {
  return {
    ...SCHWAB_TODAYS_TRADES_FORMAT,
    fieldMappings: {
      // Working Orders mappings
      'Time Placed': { 
        tradeVoyagerField: 'orderPlacedTime', 
        dataType: 'date', 
        required: false, 
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 10:15:02'] 
      },
      // Filled Orders mappings
      'Exec Time': { 
        tradeVoyagerField: 'orderExecutedTime', 
        dataType: 'date', 
        required: false,
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 09:31:36'] 
      },
      // Cancelled Orders mappings
      'Time Canceled': { 
        tradeVoyagerField: 'orderCancelledTime', 
        dataType: 'date', 
        required: false,
        transformer: 'parseSchwabDateTime',
        examples: ['9/25/24 09:33:45'] 
      },
      // Common fields
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
        tradeVoyagerField: 'orderNotes', 
        dataType: 'string', 
        required: false, 
        examples: ['OPEN', 'CANCELED'] 
      },
      'Notes': { 
        tradeVoyagerField: 'orderNotes', 
        dataType: 'string', 
        required: false, 
        examples: [''] 
      }
    },
    detectionPatterns: {
      // Look for any of these patterns to identify Schwab format
      headerPattern: ['Spread', 'Side', 'Qty', 'Symbol'],
      sampleValuePatterns: {
        'Side': /^(BUY|SELL)$/i,
        'Qty': /^[+\-]?\d+$/,
        'Pos Effect': /^TO (OPEN|CLOSE)$/i,
        'TIF': /^(DAY|GTC|IOC|FOK)$/i,
      },
      fileNamePatterns: [
        /schwab.*trade.*activity/i,
        /todays.*trade.*activity/i,
        /trade.*activity.*\d{1,2}\/\d{1,2}\/\d{2,4}/i
      ]
    }
  };
}

// Test function with sample data
function testParser() {
  const sampleCsv = `Today's Trade Activity for 56037956SCHW   ││   (Individual) on 9/25/24 10:56:32

Working Orders
Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Mark,Status
,,9/25/24 10:15:02,STOCK,BUY,+100,TO OPEN,ABC,,,STOCK,4.50,,DAY,4.50,OPEN

Filled Orders
,,Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,Price,Net Price,Order Type
,,9/25/24 09:31:36,STOCK,SELL,-25,TO CLOSE,OCTO,,,STOCK,4.29,4.29,STP
,,9/25/24 09:31:30,STOCK,BUY,+25,TO OPEN,OCTO,,,STOCK,4.33,4.33,LMT

Canceled Orders
Notes,,Time Canceled,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status
,,9/25/24 09:33:45,STOCK,SELL,-25,TO CLOSE,OCTO,,,STOCK,~,MKT,DAY,CANCELED

Rolling Strategies
Covered Call Position,New Exp,Call By,Begin (Days),Order Price,Active Time,Move to MKT Time,Status`;

  console.log('Testing Schwab CSV Parser...\n');
  const result = parseSchwabTodaysTrades(sampleCsv);
  
  console.log('Metadata:', result.metadata);
  console.log('\nWorking Orders:', result.workingOrders.length);
  if (result.workingOrders.length > 0) {
    console.log('Sample:', result.workingOrders[0]);
  }
  
  console.log('\nFilled Orders:', result.filledOrders.length);
  if (result.filledOrders.length > 0) {
    console.log('Sample:', result.filledOrders[0]);
  }
  
  console.log('\nCancelled Orders:', result.cancelledOrders.length);
  if (result.cancelledOrders.length > 0) {
    console.log('Sample:', result.cancelledOrders[0]);
  }
  
  if (result.errors.length > 0) {
    console.log('\nErrors:', result.errors);
  }
  
  console.log('\n--- Format Definition ---');
  console.log(JSON.stringify(createSchwabFormatDefinition(), null, 2));
}

// Export functions and format definition
module.exports = {
  parseSchwabTodaysTrades,
  createSchwabFormatDefinition,
  SCHWAB_TODAYS_TRADES_FORMAT,
  normalizeSchwabOrder,
  parseDateTime,
  normalizeSide,
  parseQuantity,
  normalizeOrderType
};

// Run test if executed directly
if (require.main === module) {
  testParser();
}