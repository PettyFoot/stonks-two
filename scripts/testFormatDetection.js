const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Read the actual Schwab CSV file
const csvPath = 'C:\\Users\\lcorr\\OneDrive\\Desktop\\Trades\\2024-09-25-TradeActivity.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

console.log('Testing CSV Format Detection with Real Schwab Data');
console.log('=' .repeat(60));

// Simulate how the CSV ingestion system would process this file
function simulateFormatDetection(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Find headers and sample data from the first data section
  let headers = [];
  let sampleRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for "Filled Orders" section since it has data
    if (line === 'Filled Orders' && i + 1 < lines.length) {
      const headerLine = lines[i + 1];
      
      // Parse headers
      try {
        const headerRecord = parse(headerLine, {
          columns: false,
          skip_empty_lines: true,
          trim: true
        });
        headers = headerRecord[0].filter(h => h !== '');
      } catch (e) {
        // Fallback to simple split
        headers = headerLine.split(',').map(h => h.trim()).filter(h => h !== '');
      }
      
      // Get sample data rows (non-empty ones)
      for (let j = i + 2; j < Math.min(i + 8, lines.length); j++) {
        const dataLine = lines[j];
        if (dataLine && !dataLine.startsWith('Canceled Orders') && dataLine.includes(',')) {
          try {
            const values = parse(dataLine, {
              columns: false,
              skip_empty_lines: true,
              trim: true
            });
            
            if (values[0] && values[0].length > 0) {
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[0][index] || '';
              });
              
              // Only add rows with meaningful data
              if (row['Symbol'] && row['Symbol'] !== '') {
                sampleRows.push(row);
              }
            }
          } catch (e) {
            // Skip problematic rows
          }
        }
      }
      break;
    }
  }
  
  return { headers, sampleRows };
}

// Test the detection
const { headers, sampleRows } = simulateFormatDetection(csvContent);

console.log('Headers detected:');
headers.forEach((header, i) => console.log(`  ${i + 1}. "${header}"`));

console.log(`\nSample rows: ${sampleRows.length}`);
sampleRows.forEach((row, i) => {
  console.log(`\nRow ${i + 1}:`);
  Object.entries(row).forEach(([key, value]) => {
    if (value && value !== '') {
      console.log(`  ${key}: "${value}"`);
    }
  });
});

// Manual format detection simulation
console.log('\n🔍 FORMAT DETECTION ANALYSIS:');
console.log('-'.repeat(40));

// Check for Schwab-specific patterns
const requiredHeaders = ['Spread', 'Side', 'Qty', 'Symbol'];
const headerMatches = requiredHeaders.filter(required => 
  headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
);

console.log(`Required headers found: ${headerMatches.length}/${requiredHeaders.length}`);
console.log(`Headers: [${headerMatches.join(', ')}]`);

// Check sample value patterns
const sidePattern = /^(BUY|SELL)$/i;
const qtyPattern = /^[+\-]?\d+$/;
const posEffectPattern = /^TO (OPEN|CLOSE)$/i;

let patternMatches = 0;
let totalChecks = 0;

// Check Side pattern
const sideValues = sampleRows.map(row => row['Side']).filter(Boolean);
if (sideValues.length > 0) {
  const sideMatches = sideValues.filter(value => sidePattern.test(value)).length;
  console.log(`Side pattern: ${sideMatches}/${sideValues.length} matches`);
  if (sideMatches / sideValues.length >= 0.8) patternMatches++;
  totalChecks++;
}

// Check Qty pattern
const qtyValues = sampleRows.map(row => row['Qty']).filter(Boolean);
if (qtyValues.length > 0) {
  const qtyMatches = qtyValues.filter(value => qtyPattern.test(value)).length;
  console.log(`Qty pattern: ${qtyMatches}/${qtyValues.length} matches`);
  if (qtyMatches / qtyValues.length >= 0.8) patternMatches++;
  totalChecks++;
}

// Check Pos Effect pattern
const posValues = sampleRows.map(row => row['Pos Effect']).filter(Boolean);
if (posValues.length > 0) {
  const posMatches = posValues.filter(value => posEffectPattern.test(value)).length;
  console.log(`Pos Effect pattern: ${posMatches}/${posValues.length} matches`);
  if (posMatches / posValues.length >= 0.8) patternMatches++;
  totalChecks++;
}

// Calculate confidence
const headerScore = headerMatches.length / requiredHeaders.length;
const patternScore = totalChecks > 0 ? patternMatches / totalChecks : 0;
const overallConfidence = (headerScore * 0.6) + (patternScore * 0.4);

console.log(`\nConfidence Calculation:`);
console.log(`  Header score: ${(headerScore * 100).toFixed(1)}%`);
console.log(`  Pattern score: ${(patternScore * 100).toFixed(1)}%`);
console.log(`  Overall confidence: ${(overallConfidence * 100).toFixed(1)}%`);

if (overallConfidence >= 0.7) {
  console.log('\n✅ SUCCESS: Schwab format would be detected automatically!');
  console.log('The CSV ingestion system would recognize this as a Schwab Today\'s Trade Activity file.');
} else {
  console.log('\n⚠️  The confidence is below threshold, but the format is still parseable.');
}

console.log('\n📝 SUMMARY:');
console.log(`This CSV contains ${sampleRows.length} trade records that would be processed as:`);
sampleRows.forEach((row, i) => {
  if (row.Symbol) {
    console.log(`  ${i + 1}. ${row.Side} ${row.Qty} ${row.Symbol} @ ${row.Price || row['Net Price'] || 'MKT'}`);
  }
});