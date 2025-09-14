import { readFileSync } from 'fs';
import { CsvIngestionService } from '../src/lib/csvIngestion';

async function testFormatDetection() {
  console.log('🧪 Testing CSV format detection after migration to database...\n');

  try {
    // Read the test CSV file
    const csvContent = readFileSync('c:\\Dev\\AI\\StonksTwo\\test-csv\\orders5.csv', 'utf-8');
    console.log('📁 Loaded CSV file: orders5.csv');
    console.log('📄 First few lines:');
    console.log(csvContent.split('\n').slice(0, 3).join('\n'));
    console.log('...\n');

    // Initialize the ingestion service
    const ingestionService = new CsvIngestionService();

    // Test validation (which includes format detection)
    console.log('🔍 Running format detection...');
    const result = await ingestionService.validateCsvFile(csvContent);

    console.log('\n📊 Validation Results:');
    console.log(`✅ Valid: ${result.isValid}`);
    console.log(`📋 Headers (${result.headers.length}): ${result.headers.join(', ')}`);
    console.log(`📈 Row count: ${result.rowCount}`);
    console.log(`📏 File size: ${(result.fileSize / 1024).toFixed(2)} KB`);

    if (result.detectedFormat) {
      console.log('\n🎯 Detected Format:');
      console.log(`   Name: ${result.detectedFormat.name}`);
      console.log(`   Description: ${result.detectedFormat.description}`);
      console.log(`   Broker: ${result.detectedFormat.brokerName}`);
      console.log(`   Confidence: ${(result.formatConfidence * 100).toFixed(1)}%`);
      console.log(`   Fingerprint: ${result.detectedFormat.fingerprint}`);

      if (result.formatReasoning && result.formatReasoning.length > 0) {
        console.log('\n💭 Detection Reasoning:');
        result.formatReasoning.forEach((reason, i) => {
          console.log(`   ${i + 1}. ${reason}`);
        });
      }

      console.log('\n🗺️  Field Mappings:');
      const mappings = result.detectedFormat.fieldMappings;
      Object.entries(mappings).slice(0, 8).forEach(([csvField, mapping]) => {
        console.log(`   ${csvField} → ${mapping.tradeVoyagerField} (${mapping.dataType})`);
      });
    } else {
      console.log('\n❌ No format detected');
    }

    if (result.brokerDetection) {
      console.log('\n🏢 Broker Detection:');
      console.log(`   Broker: ${result.brokerDetection.broker?.name || 'Unknown'}`);
      console.log(`   Format: ${result.brokerDetection.format?.formatName || 'None'}`);
      console.log(`   Confidence: ${(result.brokerDetection.confidence * 100).toFixed(1)}%`);
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n✅ Format detection test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFormatDetection();