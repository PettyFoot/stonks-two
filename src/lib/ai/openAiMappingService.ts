import OpenAI from 'openai';
import { TRADE_VOYAGER_FIELDS } from '@/lib/csvFormatRegistry';

// OpenAI mapping configuration
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
} as const;

// All mappable Order table fields (excluding system-generated fields)
const ORDER_FIELDS = {
  // Critical fields (must be mapped for valid trades)
  symbol: 'Stock ticker symbol (e.g., AAPL, MSFT)',
  side: 'Buy or Sell action (BUY/SELL)',
  orderQuantity: 'Number of shares or contracts',
  orderPlacedTime: 'When the order was placed/submitted',
  orderExecutedTime: 'When the order was executed/filled',
  
  // Important fields (highly recommended for mapping)
  limitPrice: 'Limit order price per share',
  orderType: 'Order type (MARKET, LIMIT, STOP, STOP_LIMIT)',
  orderStatus: 'Order status (FILLED, CANCELLED, PENDING, REJECTED)',
  orderId: 'Broker-assigned order identifier',
  
  // Optional but useful fields
  parentOrderId: 'Parent order ID for multi-leg strategies',
  timeInForce: 'Time in force (DAY, GTC, IOC, FOK)',
  stopPrice: 'Stop price for stop orders',
  orderUpdatedTime: 'Last time order was modified',
  orderCancelledTime: 'When order was cancelled',
  accountId: 'Broker account identifier/number',
  orderAccount: 'Account name or description',
  orderRoute: 'Order routing destination (ARCA, NASDAQ, etc.)',
  tags: 'User-defined tags or categories',
  tradeId: 'Associated trade group identifier'
} as const;

// Critical fields that should be prioritized in mapping
const CRITICAL_FIELDS = [
  'symbol',
  'side', 
  'orderQuantity',
  'orderPlacedTime',
  'orderExecutedTime'
] as const;

// Mapping result structure
export interface OpenAiMappingResult {
  mappings: {
    [csvHeader: string]: {
      field: string;
      confidence: number;
      reasoning?: string;
    };
  };
  overallConfidence: number;
  unmappedFields: string[];
  brokerMetadataFields: string[];
  suggestions: string[];
}

// Request structure for OpenAI
interface MappingRequest {
  csvHeaders: string[];
  sampleData?: Record<string, unknown>[];
  brokerName?: string;
  existingMappings?: Record<string, string>;
}

export class OpenAiMappingService {
  private client: OpenAI;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('OpenAI API key not configured. Will fall back to heuristic mapping.');
      this.isConfigured = false;
      // Create a dummy client to prevent runtime errors
      this.client = {} as OpenAI;
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
      this.isConfigured = true;
    }
  }

  /**
   * Analyze CSV headers and map them to Order table fields using OpenAI
   */
  async analyzeHeaders(request: MappingRequest): Promise<OpenAiMappingResult> {
    console.log('🤖 OpenAI analyzeHeaders called');
    console.log('📊 Request:', { 
      headers: request.csvHeaders, 
      brokerName: request.brokerName,
      sampleDataRows: request.sampleData?.length || 0 
    });
    
    if (!this.isConfigured) {
      console.log('⚠️ OpenAI not configured, falling back to heuristics');
      return this.fallbackToHeuristics(request);
    }

    try {
      console.log('🔨 Building OpenAI prompt...');
      const prompt = this.buildMappingPrompt(request);
      console.log('📝 Prompt length:', prompt.length, 'characters');
      
      console.log('🚀 Calling OpenAI API...');
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in trading data analysis and CSV format interpretation. You excel at mapping broker CSV headers to standardized trading database fields.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('❌ No content in OpenAI response');
        throw new Error('No response from OpenAI');
      }

      console.log('✅ OpenAI API call successful');
      console.log('📝 Response length:', content.length, 'characters');
      console.log('🔍 Response preview:', content.substring(0, 200) + '...');

      const result = this.parseOpenAiResponse(content, request.csvHeaders);
      console.log('✨ Parsed result:', {
        mappingsCount: Object.keys(result.mappings).length,
        overallConfidence: result.overallConfidence,
        brokerMetadataFieldsCount: result.brokerMetadataFields.length,
        suggestionsCount: result.suggestions.length
      });

      return result;

    } catch (error) {
      console.error('OpenAI mapping failed:', error);
      return this.fallbackToHeuristics(request);
    }
  }

  /**
   * Build the prompt for OpenAI to analyze CSV headers
   */
  private buildMappingPrompt(request: MappingRequest): string {
    const { csvHeaders, sampleData, brokerName } = request;
    
    // Get all mappable Order table fields
    const orderFieldEntries = Object.entries(ORDER_FIELDS);
    const criticalFieldsList = CRITICAL_FIELDS.join(', ');
    
    let prompt = `I need to map CSV headers from ${brokerName || 'a trading broker'} to our standardized Order database fields.

**CRITICAL TRADING FIELDS (highest priority - must map these!):**
${CRITICAL_FIELDS.map(field => `- ${field}: ${ORDER_FIELDS[field as keyof typeof ORDER_FIELDS]}`).join('\n')}

**ALL AVAILABLE ORDER FIELDS:**

**Critical Fields:**
${orderFieldEntries.slice(0, 5).map(([field, desc]) => `- ${field}: ${desc}`).join('\n')}

**Important Fields:**
${orderFieldEntries.slice(5, 9).map(([field, desc]) => `- ${field}: ${desc}`).join('\n')}

**Optional Fields:**
${orderFieldEntries.slice(9).map(([field, desc]) => `- ${field}: ${desc}`).join('\n')}

**CSV HEADERS TO MAP:**
${csvHeaders.map((header, i) => `${i + 1}. "${header}"`).join('\n')}`;

    if (sampleData && sampleData.length > 0) {
      prompt += `\n\n**SAMPLE DATA (first row):**\n`;
      prompt += csvHeaders.map(header => `${header}: "${sampleData[0][header] || ''}"`).join('\n');
    }

    prompt += `\n\n**MAPPING INSTRUCTIONS:**
1. **PRIORITY:** Focus on mapping critical fields first: ${criticalFieldsList}
2. Map each CSV header to the most appropriate Order field from the list above
3. Assign confidence scores (0.0-1.0):
   - 0.9-1.0: Perfect match (e.g., "Symbol" → "symbol")
   - 0.7-0.9: Clear match with context (e.g., "Qty" → "orderQuantity") 
   - 0.5-0.7: Reasonable match (e.g., "Action" → "side")
   - 0.0-0.5: Uncertain/poor match (will go to brokerMetadata)
4. Consider common broker terminology variations:
   - "Qty", "Quantity", "Shares" → "orderQuantity"
   - "Action", "Buy/Sell", "Side" → "side"
   - "Price", "Limit", "LimitPrice" → "limitPrice"
   - "Ticker", "Symbol", "Stock" → "symbol"
   - "PlacedTime", "OrderTime", "SubmittedTime", "DateTime" → "orderPlacedTime"
   - ONLY map to "orderExecutedTime" if header contains execution-specific terms:
     * "exec", "execution", "fill", "filled", "trade" + "time"/"date"
     * Examples: "ExecTime", "ExecutionTime", "FillTime", "TradeTime"
     * If uncertain, prefer "orderPlacedTime" over "orderExecutedTime"
5. Headers that don't map well to any field should have confidence < 0.5
6. Return response as valid JSON only

**REQUIRED JSON RESPONSE FORMAT:**
\`\`\`json
{
  "mappings": {
    "CSV_HEADER_NAME": {
      "field": "orderFieldName",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this mapping makes sense"
    }
  },
  "overallConfidence": 0.85,
  "suggestions": [
    "Any insights about the broker format or potential issues"
  ]
}
\`\`\`

**IMPORTANT NOTES:** 
- Only use field names from the ORDER FIELDS list above
- Headers with confidence < 0.5 will be stored as broker metadata
- Focus on accuracy - conservative mappings are better than wrong ones
- Critical fields should get priority in mapping decisions`;

    return prompt;
  }

  /**
   * Parse OpenAI response and structure the result
   */
  private parseOpenAiResponse(content: string, csvHeaders: string[]): OpenAiMappingResult {
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      
      const parsed = JSON.parse(jsonStr);
      
      const result: OpenAiMappingResult = {
        mappings: {},
        overallConfidence: parsed.overallConfidence || 0,
        unmappedFields: [],
        brokerMetadataFields: [],
        suggestions: parsed.suggestions || []
      };

      // Process mappings and categorize fields
      for (const header of csvHeaders) {
        const mapping = parsed.mappings[header];
        
        if (mapping && mapping.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
          // High/medium confidence - map to specific field
          result.mappings[header] = {
            field: mapping.field,
            confidence: mapping.confidence,
            reasoning: mapping.reasoning
          };
        } else {
          // Low confidence or unmapped - goes to brokerMetadata
          result.brokerMetadataFields.push(header);
          result.mappings[header] = {
            field: 'brokerMetadata',
            confidence: mapping?.confidence || 0.1,
            reasoning: mapping?.reasoning || 'Low confidence mapping - storing in brokerMetadata'
          };
        }
      }

      // Calculate overall confidence based on critical field coverage
      result.overallConfidence = this.calculateOverallConfidence(result.mappings, csvHeaders);

      return result;

    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      console.log('Raw response:', content);
      
      // Return empty result that will trigger heuristic fallback
      return {
        mappings: {},
        overallConfidence: 0,
        unmappedFields: csvHeaders,
        brokerMetadataFields: csvHeaders,
        suggestions: ['Failed to parse OpenAI response, falling back to heuristic mapping']
      };
    }
  }

  /**
   * Calculate overall confidence based on critical field coverage
   */
  private calculateOverallConfidence(mappings: OpenAiMappingResult['mappings'], csvHeaders: string[]): number {
    let totalScore = 0;
    let maxScore = 0;

    for (const header of csvHeaders) {
      const mapping = mappings[header];
      if (mapping) {
        const weight = CRITICAL_FIELDS.includes(mapping.field as any) ? 3 : 1;
        totalScore += mapping.confidence * weight;
        maxScore += weight;
      } else {
        maxScore += 1; // Default weight for unmapped fields
      }
    }

    return maxScore > 0 ? totalScore / maxScore : 0;
  }

  /**
   * Fallback to heuristic mapping when OpenAI is not available
   */
  private fallbackToHeuristics(request: MappingRequest): OpenAiMappingResult {
    const { csvHeaders } = request;
    
    const result: OpenAiMappingResult = {
      mappings: {},
      overallConfidence: 0.3, // Lower confidence for heuristics
      unmappedFields: [],
      brokerMetadataFields: [],
      suggestions: ['OpenAI not available - using heuristic mapping. Consider configuring OPENAI_API_KEY for better accuracy.']
    };

    // Comprehensive heuristic mappings for all Order fields
    const heuristicMappings: Record<string, { field: string; confidence: number }> = {
      // Symbol variations
      'symbol': { field: 'symbol', confidence: 0.9 },
      'ticker': { field: 'symbol', confidence: 0.8 },
      'instrument': { field: 'symbol', confidence: 0.7 },
      'stock': { field: 'symbol', confidence: 0.7 },
      
      // Side variations
      'side': { field: 'side', confidence: 0.9 },
      'buy/sell': { field: 'side', confidence: 0.9 },
      'b/s': { field: 'side', confidence: 0.8 },
      'action': { field: 'side', confidence: 0.7 },
      'direction': { field: 'side', confidence: 0.6 },
      
      // Quantity variations
      'quantity': { field: 'orderQuantity', confidence: 0.9 },
      'qty': { field: 'orderQuantity', confidence: 0.9 },
      'shares': { field: 'orderQuantity', confidence: 0.8 },
      'volume': { field: 'orderQuantity', confidence: 0.7 },
      'amount': { field: 'orderQuantity', confidence: 0.6 },
      'size': { field: 'orderQuantity', confidence: 0.6 },
      
      // Price variations
      'price': { field: 'limitPrice', confidence: 0.8 },
      'limit price': { field: 'limitPrice', confidence: 0.9 },
      'limitprice': { field: 'limitPrice', confidence: 0.9 },
      'limit': { field: 'limitPrice', confidence: 0.8 },
      'execution price': { field: 'limitPrice', confidence: 0.7 },
      
      // Stop price variations
      'stop price': { field: 'stopPrice', confidence: 0.9 },
      'stopprice': { field: 'stopPrice', confidence: 0.9 },
      'stop': { field: 'stopPrice', confidence: 0.8 },
      
      // Order type variations
      'order type': { field: 'orderType', confidence: 0.9 },
      'ordertype': { field: 'orderType', confidence: 0.9 },
      'type': { field: 'orderType', confidence: 0.7 },
      
      // Order status variations
      'status': { field: 'orderStatus', confidence: 0.8 },
      'order status': { field: 'orderStatus', confidence: 0.9 },
      'orderstatus': { field: 'orderStatus', confidence: 0.9 },
      'state': { field: 'orderStatus', confidence: 0.7 },
      
      // Time variations - Placed
      'time placed': { field: 'orderPlacedTime', confidence: 0.9 },
      'timeplaced': { field: 'orderPlacedTime', confidence: 0.9 },
      'placed time': { field: 'orderPlacedTime', confidence: 0.9 },
      'order time': { field: 'orderPlacedTime', confidence: 0.8 },
      'submitted time': { field: 'orderPlacedTime', confidence: 0.8 },
      'created time': { field: 'orderPlacedTime', confidence: 0.7 },
      
      // Time variations - Executed (only map if header contains execution-specific terms)
      'exec time': { field: 'orderExecutedTime', confidence: 0.9 },
      'exectime': { field: 'orderExecutedTime', confidence: 0.9 },
      'executed time': { field: 'orderExecutedTime', confidence: 0.9 },
      'executedtime': { field: 'orderExecutedTime', confidence: 0.9 },
      'execution time': { field: 'orderExecutedTime', confidence: 0.9 },
      'executiontime': { field: 'orderExecutedTime', confidence: 0.9 },
      'exec date': { field: 'orderExecutedTime', confidence: 0.8 },
      'execdate': { field: 'orderExecutedTime', confidence: 0.8 },
      'execution date': { field: 'orderExecutedTime', confidence: 0.8 },
      'executiondate': { field: 'orderExecutedTime', confidence: 0.8 },
      'fill time': { field: 'orderExecutedTime', confidence: 0.8 },
      'filltime': { field: 'orderExecutedTime', confidence: 0.8 },
      'filled time': { field: 'orderExecutedTime', confidence: 0.8 },
      'filledtime': { field: 'orderExecutedTime', confidence: 0.8 },
      'fill date': { field: 'orderExecutedTime', confidence: 0.8 },
      'filldate': { field: 'orderExecutedTime', confidence: 0.8 },
      'filled date': { field: 'orderExecutedTime', confidence: 0.8 },
      'filleddate': { field: 'orderExecutedTime', confidence: 0.8 },
      'trade time': { field: 'orderExecutedTime', confidence: 0.7 },
      'tradetime': { field: 'orderExecutedTime', confidence: 0.7 },
      'trade date': { field: 'orderExecutedTime', confidence: 0.7 },
      'tradedate': { field: 'orderExecutedTime', confidence: 0.7 },
      
      // Time variations - Updated
      'updated time': { field: 'orderUpdatedTime', confidence: 0.9 },
      'last modified': { field: 'orderUpdatedTime', confidence: 0.8 },
      'modified time': { field: 'orderUpdatedTime', confidence: 0.8 },
      
      // Time variations - Cancelled
      'cancelled time': { field: 'orderCancelledTime', confidence: 0.9 },
      'cancel time': { field: 'orderCancelledTime', confidence: 0.8 },
      
      // Order ID variations
      'order id': { field: 'orderId', confidence: 0.9 },
      'orderid': { field: 'orderId', confidence: 0.9 },
      'id': { field: 'orderId', confidence: 0.7 },
      'order number': { field: 'orderId', confidence: 0.8 },
      'order ref': { field: 'orderId', confidence: 0.8 },
      
      // Parent order variations
      'parent order': { field: 'parentOrderId', confidence: 0.9 },
      'parent id': { field: 'parentOrderId', confidence: 0.8 },
      'original order': { field: 'parentOrderId', confidence: 0.7 },
      
      // Time in force variations
      'time in force': { field: 'timeInForce', confidence: 0.9 },
      'tif': { field: 'timeInForce', confidence: 0.8 },
      'duration': { field: 'timeInForce', confidence: 0.7 },
      
      // Account variations
      'account': { field: 'accountId', confidence: 0.8 },
      'account id': { field: 'accountId', confidence: 0.9 },
      'account number': { field: 'accountId', confidence: 0.9 },
      'acct': { field: 'orderAccount', confidence: 0.7 },
      'account name': { field: 'orderAccount', confidence: 0.8 },
      
      // Route variations
      'route': { field: 'orderRoute', confidence: 0.8 },
      'exchange': { field: 'orderRoute', confidence: 0.7 },
      'venue': { field: 'orderRoute', confidence: 0.7 },
      
      // Tags variations
      'tags': { field: 'tags', confidence: 0.9 },
      'tag': { field: 'tags', confidence: 0.8 },
      'category': { field: 'tags', confidence: 0.6 },
      
      // Trade ID variations
      'trade id': { field: 'tradeId', confidence: 0.9 },
      'tradeid': { field: 'tradeId', confidence: 0.9 },
      'group id': { field: 'tradeId', confidence: 0.7 },
    };

    // Apply heuristic mappings
    for (const header of csvHeaders) {
      const normalized = header.toLowerCase().trim();
      const mapping = heuristicMappings[normalized];
      
      if (mapping && mapping.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        result.mappings[header] = {
          field: mapping.field,
          confidence: mapping.confidence,
          reasoning: 'Heuristic pattern match'
        };
      } else {
        // Store in brokerMetadata
        result.brokerMetadataFields.push(header);
        result.mappings[header] = {
          field: 'brokerMetadata',
          confidence: 0.1,
          reasoning: 'No clear pattern match - storing in brokerMetadata'
        };
      }
    }

    result.overallConfidence = this.calculateOverallConfidence(result.mappings, csvHeaders);
    
    return result;
  }

  /**
   * Generate a fingerprint for CSV headers (for caching and format detection)
   */
  generateHeaderFingerprint(headers: string[]): string {
    // Sort headers and create a hash
    const sortedHeaders = [...headers].sort().map(h => h.toLowerCase().trim());
    return Buffer.from(sortedHeaders.join('|')).toString('base64');
  }

  /**
   * Check if the service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}