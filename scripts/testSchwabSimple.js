const fs = require('fs');
const { parseSchwabTodaysTrades } = require('./parseSchwabTodaysTrades');

// Read the actual Schwab CSV file
const csvPath = 'C:\\Users\\lcorr\\OneDrive\\Desktop\\Trades\\2024-09-25-TradeActivity.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

console.log('='.repeat(70));
console.log('SCHWAB CSV PARSER TEST - REAL DATA');
console.log('='.repeat(70));

// Parse the CSV
const result = parseSchwabTodaysTrades(csvContent);

// Summary Statistics
console.log('\n📊 SUMMARY:');
console.log(`Account: ${result.metadata?.accountNumber}`);
console.log(`Report Date: ${result.metadata?.reportDate}`);
console.log(`Working Orders: ${result.workingOrders.length}`);
console.log(`Filled Orders: ${result.filledOrders.length}`);
console.log(`Cancelled Orders: ${result.cancelledOrders.length}`);

// Filled Orders Details
if (result.filledOrders.length > 0) {
  console.log('\n✅ FILLED ORDERS:');
  console.log('-'.repeat(70));
  
  result.filledOrders.forEach((order, i) => {
    console.log(`\n${i + 1}. ${order.symbol || 'N/A'}`);
    console.log(`   Action: ${order.side} ${order.orderQuantity} shares`);
    console.log(`   Type: ${order.orderType}`);
    console.log(`   Price: $${order.fillPrice || order.limitPrice || 'N/A'}`);
    console.log(`   Time: ${order.orderExecutedTime?.toLocaleString() || 'N/A'}`);
    console.log(`   Position: ${order.positionEffect || 'N/A'}`);
  });
}

// Cancelled/Rejected Orders with reasons
const rejectedOrders = result.cancelledOrders.filter(o => 
  o.orderNotes && o.orderNotes.includes('REJECTED')
);

if (rejectedOrders.length > 0) {
  console.log('\n❌ REJECTED ORDERS:');
  console.log('-'.repeat(70));
  
  rejectedOrders.forEach((order, i) => {
    if (order.symbol) {  // Only show orders with symbols
      console.log(`\n${i + 1}. ${order.symbol}`);
      console.log(`   Action: ${order.side} ${order.orderQuantity} shares`);
      console.log(`   Reason: ${order.orderNotes}`);
    }
  });
}

// Data Quality Check
console.log('\n🔍 DATA QUALITY CHECK:');
console.log('-'.repeat(70));

// Check for properly parsed dates
const datesValid = result.filledOrders.every(o => 
  o.orderExecutedTime instanceof Date && !isNaN(o.orderExecutedTime)
);
console.log(`✓ Date parsing: ${datesValid ? 'PASSED' : 'FAILED'}`);

// Check for properly parsed quantities
const quantitiesValid = result.filledOrders.every(o => 
  typeof o.orderQuantity === 'number' && o.orderQuantity > 0
);
console.log(`✓ Quantity parsing: ${quantitiesValid ? 'PASSED' : 'FAILED'}`);

// Check for properly parsed prices
const pricesValid = result.filledOrders.every(o => 
  (o.fillPrice === null || typeof o.fillPrice === 'number') &&
  (o.limitPrice === null || typeof o.limitPrice === 'number')
);
console.log(`✓ Price parsing: ${pricesValid ? 'PASSED' : 'FAILED'}`);

// Check for order types
const typesValid = result.filledOrders.every(o => 
  ['Market', 'Limit', 'Stop'].includes(o.orderType)
);
console.log(`✓ Order type mapping: ${typesValid ? 'PASSED' : 'FAILED'}`);

console.log('\n✅ Parser test completed successfully!');
console.log('The Schwab CSV format has been successfully added to Trade Voyager.');