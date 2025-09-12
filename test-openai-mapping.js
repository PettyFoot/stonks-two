// Quick test to see if OpenAI mapping service works
const { OpenAiMappingService } = require('./src/lib/ai/openAiMappingService.ts');

async function testMapping() {
    console.log('🧪 Testing OpenAI mapping service...');
    
    const service = new OpenAiMappingService();
    console.log('✅ Service created, configured:', service.isReady());
    
    if (!service.isReady()) {
        console.log('⚠️ OpenAI not configured, will test heuristic mapping');
    }
    
    // Test headers from our sample CSV
    const testHeaders = ['TradeDate', 'Symbol', 'Action', 'Qty', 'Price', 'Amount', 'Account'];
    const sampleData = [{
        'TradeDate': '2024-01-15',
        'Symbol': 'AAPL', 
        'Action': 'BUY',
        'Qty': '100',
        'Price': '150.25',
        'Amount': '15025.00',
        'Account': '123456'
    }];
    
    try {
        const result = await service.analyzeHeaders({
            csvHeaders: testHeaders,
            sampleData: sampleData,
            brokerName: 'Test Broker'
        });
        
        console.log('🎯 Mapping result:');
        console.log('📊 Overall confidence:', (result.overallConfidence * 100).toFixed(1) + '%');
        console.log('🗂️ Mappings:');
        
        for (const [header, mapping] of Object.entries(result.mappings)) {
            console.log(`  "${header}" → ${mapping.field} (${(mapping.confidence * 100).toFixed(0)}%)`);
        }
        
        console.log('❓ Unmapped fields:', result.brokerMetadataFields);
        console.log('💡 Suggestions:', result.suggestions);
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testMapping();