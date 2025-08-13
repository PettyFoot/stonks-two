const fs = require('fs');
const path = require('path');
const { parseSchwabTodaysTrades, createSchwabFormatDefinition } = require('./parseSchwabTodaysTrades');

// Read the actual Schwab CSV file
const csvPath = 'C:\\Users\\lcorr\\OneDrive\\Desktop\\Trades\\2024-09-25-TradeActivity.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

console.log('Testing with real Schwab data from:', csvPath);
console.log('=' .repeat(60));

// Parse the CSV
const result = parseSchwabTodaysTrades(csvContent);

// Display metadata
console.log('\n📊 METADATA:');
console.log('Account:', result.metadata?.accountNumber);
console.log('Report Date:', result.metadata?.reportDate);

// Display Working Orders
console.log('\n⏳ WORKING ORDERS:', result.workingOrders.length);
result.workingOrders.forEach((order, i) => {
  console.log(`  ${i + 1}. ${order.symbol} - ${order.side} ${order.orderQuantity} @ ${order.limitPrice || 'MKT'} (${order.orderStatus})`);
});

// Display Filled Orders
console.log('\n✅ FILLED ORDERS:', result.filledOrders.length);
result.filledOrders.forEach((order, i) => {
  console.log(`  ${i + 1}. ${order.symbol} - ${order.side} ${order.orderQuantity} @ ${order.fillPrice || order.limitPrice} (${order.orderType})`);
  console.log(`     Time: ${order.orderExecutedTime?.toLocaleString()}`);
});

// Display Cancelled Orders
console.log('\n❌ CANCELLED ORDERS:', result.cancelledOrders.length);
result.cancelledOrders.forEach((order, i) => {
  console.log(`  ${i + 1}. ${order.symbol} - ${order.side} ${order.orderQuantity} @ ${order.limitPrice || 'MKT'} (${order.orderStatus})`);
  if (order.orderNotes) {
    console.log(`     Reason: ${order.orderNotes}`);
  }
});

// Display any errors
if (result.errors.length > 0) {
  console.log('\n⚠️ PARSING ERRORS:');
  result.errors.forEach(error => console.log('  -', error));
}

// Test CSV format detection
console.log('\n🔍 FORMAT DETECTION TEST:');
const { CsvFormatDetector } = require('../src/lib/csvFormatRegistry');
const { parse } = require('csv-parse/sync');

// Parse to get headers and sample rows
const lines = csvContent.split('\n').filter(line => line.trim());
let headers = [];
let sampleRows = [];

// Find the first data section (Filled Orders since Working Orders is empty)
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === 'Filled Orders' && lines[i + 1]) {
    const headerLine = lines[i + 1];
    headers = headerLine.split(',').map(h => h.trim()).filter(h => h);
    
    // Get sample data rows
    for (let j = i + 2; j < Math.min(i + 7, lines.length); j++) {
      if (lines[j] && !lines[j].startsWith('Canceled Orders')) {
        const values = lines[j].split(',');
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] ? values[idx].trim() : '';
        });
        sampleRows.push(row);
      }
    }
    break;
  }
}

console.log('Headers found:', headers);
console.log('Sample rows:', sampleRows.length);

// Test format detection
const detector = new CsvFormatDetector();
const detection = detector.detectFormat(headers, sampleRows);

console.log('\nDetected Format:', detection.format?.name || 'Unknown');
console.log('Confidence:', (detection.confidence * 100).toFixed(1) + '%');
console.log('Reasoning:');
detection.reasoning.forEach(reason => console.log('  -', reason));

console.log('\n✅ Test completed successfully!');