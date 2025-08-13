const fs = require('fs');

// Read the actual Schwab CSV file
const csvPath = 'C:\\Users\\lcorr\\OneDrive\\Desktop\\Trades\\2024-09-25-TradeActivity.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

console.log('='.repeat(80));
console.log('FULL INTEGRATION TEST - SCHWAB CSV FORMAT IN TRADE VOYAGER');
console.log('='.repeat(80));

// Test 1: File Content Pattern Recognition
console.log('\n🔍 TEST 1: File Content Pattern Recognition');
console.log('-'.repeat(50));

const fileStartPattern = /Today's Trade Activity for \d+\w*\s+.*on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i;
const fileStartMatch = fileStartPattern.test(csvContent);

console.log(`File start pattern match: ${fileStartMatch ? '✅ PASS' : '❌ FAIL'}`);
if (fileStartMatch) {
  const match = csvContent.match(fileStartPattern);
  console.log(`Matched: "${match[0]}"`);
}

const sectionHeaders = ['Working Orders', 'Filled Orders', 'Canceled Orders'];
const sectionMatches = sectionHeaders.filter(section => csvContent.includes(section));
console.log(`Section headers found: ${sectionMatches.length}/${sectionHeaders.length}`);
console.log(`Sections: [${sectionMatches.join(', ')}]`);

// Test 2: Parse with our custom parser
console.log('\n📊 TEST 2: Custom Parser Results');
console.log('-'.repeat(50));

const { parseSchwabTodaysTrades } = require('./parseSchwabTodaysTrades');
const parseResult = parseSchwabTodaysTrades(csvContent);

console.log(`✅ Successfully parsed CSV file`);
console.log(`📈 Trade Summary:`);
console.log(`   • Working Orders: ${parseResult.workingOrders.length}`);
console.log(`   • Filled Orders: ${parseResult.filledOrders.length}`);
console.log(`   • Cancelled Orders: ${parseResult.cancelledOrders.length}`);
console.log(`   • Parse Errors: ${parseResult.errors.length}`);

// Test 3: Format Detection Confidence
console.log('\n🎯 TEST 3: Format Detection Confidence');
console.log('-'.repeat(50));

// Simulate detection confidence calculation
let detectionScore = 0;
let maxScore = 0;

// File pattern recognition (80% weight)
if (fileStartMatch) {
  detectionScore += 0.8;
}
maxScore += 0.8;

// Section headers (20% weight)
const sectionScore = sectionMatches.length / sectionHeaders.length;
detectionScore += sectionScore * 0.2;
maxScore += 0.2;

const finalConfidence = detectionScore / maxScore;

console.log(`Detection confidence: ${(finalConfidence * 100).toFixed(1)}%`);
console.log(`Confidence threshold: 70.0%`);
console.log(`Result: ${finalConfidence >= 0.7 ? '✅ WOULD BE AUTO-DETECTED' : '⚠️ WOULD NEED MANUAL MAPPING'}`);

// Test 4: Data Quality Assessment
console.log('\n🔬 TEST 4: Data Quality Assessment');
console.log('-'.repeat(50));

const filledOrders = parseResult.filledOrders;
let qualityChecks = [];

// Check 1: All filled orders have symbols
const symbolsPresent = filledOrders.every(order => order.symbol && order.symbol.trim() !== '');
qualityChecks.push({ check: 'Symbols present', passed: symbolsPresent });

// Check 2: All filled orders have valid quantities
const quantitiesValid = filledOrders.every(order => 
  typeof order.orderQuantity === 'number' && order.orderQuantity > 0
);
qualityChecks.push({ check: 'Quantities valid', passed: quantitiesValid });

// Check 3: All filled orders have execution times
const timesPresent = filledOrders.every(order => 
  order.orderExecutedTime instanceof Date && !isNaN(order.orderExecutedTime.getTime())
);
qualityChecks.push({ check: 'Execution times valid', passed: timesPresent });

// Check 4: All filled orders have prices
const pricesPresent = filledOrders.every(order => 
  (order.fillPrice && order.fillPrice > 0) || (order.limitPrice && order.limitPrice > 0)
);
qualityChecks.push({ check: 'Prices present', passed: pricesPresent });

// Check 5: Order types are mapped correctly
const orderTypesMapped = filledOrders.every(order => 
  ['Market', 'Limit', 'Stop'].includes(order.orderType)
);
qualityChecks.push({ check: 'Order types mapped', passed: orderTypesMapped });

qualityChecks.forEach(check => {
  console.log(`   ${check.passed ? '✅' : '❌'} ${check.check}`);
});

const qualityScore = qualityChecks.filter(check => check.passed).length / qualityChecks.length;
console.log(`\nOverall data quality: ${(qualityScore * 100).toFixed(1)}%`);

// Test 5: Sample Trade Data Preview
console.log('\n📋 TEST 5: Sample Trade Data Preview');
console.log('-'.repeat(50));

console.log('Sample trades that would be imported into Trade Voyager:');
filledOrders.slice(0, 3).forEach((order, i) => {
  console.log(`\n${i + 1}. Trade Details:`);
  console.log(`   Symbol: ${order.symbol}`);
  console.log(`   Action: ${order.side} ${order.orderQuantity} shares`);
  console.log(`   Price: $${order.fillPrice || order.limitPrice}`);
  console.log(`   Time: ${order.orderExecutedTime.toLocaleString()}`);
  console.log(`   Type: ${order.orderType}`);
  console.log(`   Position: ${order.positionEffect}`);
});

// Test 6: Error Handling
console.log('\n⚠️ TEST 6: Error Handling');
console.log('-'.repeat(50));

const rejectedOrders = parseResult.cancelledOrders.filter(order => 
  order.orderNotes && order.orderNotes.includes('REJECTED')
);

console.log(`Rejected orders captured: ${rejectedOrders.length}`);
rejectedOrders.slice(0, 2).forEach((order, i) => {
  if (order.symbol) {
    console.log(`\n${i + 1}. ${order.symbol} - ${order.side} ${order.orderQuantity}`);
    console.log(`   Reason: ${order.orderNotes.substring(0, 80)}...`);
  }
});

// Final Summary
console.log('\n🏆 INTEGRATION TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ File format detection: ${finalConfidence >= 0.7 ? 'PASSED' : 'FAILED'}`);
console.log(`✅ Data parsing: ${parseResult.errors.length === 0 ? 'PASSED' : 'FAILED'}`);
console.log(`✅ Data quality: ${qualityScore >= 0.8 ? 'PASSED' : 'FAILED'}`);
console.log(`✅ Trade extraction: ${filledOrders.length > 0 ? 'PASSED' : 'FAILED'}`);

if (finalConfidence >= 0.7 && parseResult.errors.length === 0 && 
    qualityScore >= 0.8 && filledOrders.length > 0) {
  console.log('\n🎉 SUCCESS: The Schwab CSV format is fully integrated!');
  console.log('Users can now upload Schwab "Today\'s Trade Activity" files.');
  console.log(`This file would import ${filledOrders.length} executed trades.`);
} else {
  console.log('\n⚠️ Some integration tests failed. Review the results above.');
}

console.log('\n' + '='.repeat(80));