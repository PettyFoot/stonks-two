import { STANDARD_CSV_COLUMNS, REQUIRED_COLUMNS, NormalizedTrade, parseDate, parseNumber, SIDE_MAPPING } from '@/lib/schemas/standardCsv';

// AI mapping confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
} as const;

// Column mapping suggestion
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  reasoning: string;
  priority?: number; // Higher numbers = higher priority (0-10)
}

// AI mapping result
export interface AiMappingResult {
  mappings: ColumnMapping[];
  overallConfidence: number;
  requiresUserReview: boolean;
  missingRequired: string[];
  suggestions: string[];
  detectedFormat?: Record<string, unknown>; // CsvFormat from csvFormatRegistry
  formatConfidence?: number;
}

// Custom CSV row (unknown structure)
export type CustomCsvRow = Record<string, string>;

// AI-powered column mapper
export class CsvAiMapper {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeAndMapColumns(headers: string[], sampleRows: CustomCsvRow[]): Promise<AiMappingResult> {
    try {
      const mappings = await this.generateColumnMappings(headers, sampleRows);
      const overallConfidence = this.calculateOverallConfidence(mappings);
      const missingRequired = this.findMissingRequiredColumns(mappings);
      const requiresUserReview = overallConfidence < CONFIDENCE_THRESHOLDS.HIGH || missingRequired.length > 0;
      const suggestions = this.generateSuggestions(mappings, missingRequired);

      return {
        mappings,
        overallConfidence,
        requiresUserReview,
        missingRequired,
        suggestions,
      };
    } catch (error) {
      console.error('AI mapping failed:', error);
      return this.fallbackMapping();
    }
  }

  private async generateColumnMappings(headers: string[], sampleRows: CustomCsvRow[]): Promise<ColumnMapping[]> {
    const prompt = this.buildMappingPrompt(headers, sampleRows);
    
    try {
      // Using a hypothetical AI service (replace with actual implementation)
      const response = await this.callAiService(prompt);
      return this.parseMappingResponse(response);
    } catch (error) {
      console.error('AI service call failed:', error);
      return this.heuristicMapping(headers, sampleRows);
    }
  }

  private buildMappingPrompt(headers: string[], sampleRows: CustomCsvRow[]): string {
    const standardColumns = STANDARD_CSV_COLUMNS.join(', ');
    const requiredColumns = REQUIRED_COLUMNS.join(', ');
    
    return `
Analyze this CSV file and map its columns to our standard trading format.

Standard columns: ${standardColumns}
Required columns: ${requiredColumns}

CSV Headers: ${headers.join(', ')}

Sample data (first 3 rows):
${sampleRows.slice(0, 3).map((row, i) => 
  `Row ${i + 1}: ${headers.map(h => `${h}: "${row[h] || ''}"`).join(', ')}`
).join('\n')}

Please provide a JSON response with column mappings. For each mapping, include:
- sourceColumn: the original CSV column name
- targetColumn: the standard column it maps to (or null if no good match)
- confidence: 0.0 to 1.0 confidence score
- reasoning: brief explanation of why this mapping makes sense

Example response format:
{
  "mappings": [
    {
      "sourceColumn": "TradeDate",
      "targetColumn": "Date",
      "confidence": 0.95,
      "reasoning": "Column name suggests date field, sample data shows valid dates"
    }
  ]
}
`;
  }

  private async callAiService(_prompt: string): Promise<Record<string, unknown>> {
    // This would integrate with OpenAI/Claude/etc.
    // For now, implementing a mock response based on heuristics
    throw new Error('AI service not implemented - falling back to heuristics');
  }

  private parseMappingResponse(response: Record<string, unknown>): ColumnMapping[] {
    // Parse AI response into ColumnMapping array
    return (response.mappings as ColumnMapping[]) || [];
  }

  // Heuristic-based mapping as fallback with duplicate prevention
  private heuristicMapping(headers: string[], sampleRows: CustomCsvRow[]): ColumnMapping[] {
    const potentialMappings: ColumnMapping[] = [];

    // First pass: Find all potential mappings
    for (const header of headers) {
      const mapping = this.findBestMatch(header, sampleRows);
      if (mapping) {
        potentialMappings.push(mapping);
      }
    }

    // Second pass: Resolve conflicts using first-match-wins and priority
    return this.resolveMappingConflicts(potentialMappings);
  }
  
  // Resolve mapping conflicts using priority and first-match-wins
  private resolveMappingConflicts(mappings: ColumnMapping[]): ColumnMapping[] {
    const resolvedMappings: ColumnMapping[] = [];
    const usedTargets = new Set<string>();
    
    // Sort by priority (higher first), then by confidence (higher first), then by source column name
    mappings.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.sourceColumn.localeCompare(b.sourceColumn);
    });
    
    for (const mapping of mappings) {
      if (!usedTargets.has(mapping.targetColumn)) {
        resolvedMappings.push(mapping);
        usedTargets.add(mapping.targetColumn);
      } else {
        // Log skipped duplicate for debugging
        console.log(`AI Mapper: Skipped duplicate mapping ${mapping.sourceColumn} -> ${mapping.targetColumn} (already mapped)`);
      }
    }
    
    return resolvedMappings;
  }

  private findBestMatch(sourceColumn: string, sampleRows: CustomCsvRow[]): ColumnMapping | null {
    const lowerColumn = sourceColumn.toLowerCase();
    const sampleValues = sampleRows.map(row => row[sourceColumn]).filter(Boolean);

    // Order ID mappings with priority
    if (this.matchesPattern(lowerColumn, ['tradeid'])) {
      return {
        sourceColumn,
        targetColumn: 'orderId',
        confidence: 0.9,
        priority: 10, // Highest priority for TradeID
        reasoning: `Column name "${sourceColumn}" is primary order identifier`
      };
    }
    
    if (this.matchesPattern(lowerColumn, ['orderid', 'iborderid'])) {
      return {
        sourceColumn,
        targetColumn: 'orderId',
        confidence: 0.8,
        priority: 8, // Lower priority than TradeID
        reasoning: `Column name "${sourceColumn}" suggests order identifier`
      };
    }
    
    if (this.matchesPattern(lowerColumn, ['transactionid', 'ibexecid', 'brokerageorderid', 'exchorderid', 'extexecid'])) {
      return {
        sourceColumn,
        targetColumn: 'orderId',
        confidence: 0.7,
        priority: 5, // Lower priority - these are secondary IDs
        reasoning: `Column name "${sourceColumn}" suggests transaction identifier`
      };
    }

    // Symbol column mapping (high priority)
    if (this.matchesPattern(lowerColumn, ['symbol', 'ticker', 'stock', 'instrument', 'security'])) {
      const confidence = this.validateSymbolColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Symbol',
          confidence,
          priority: 9,
          reasoning: `Column name "${sourceColumn}" suggests stock symbol field`
        };
      }
    }

    // Buy/Sell column mapping (high priority)
    if (this.matchesPattern(lowerColumn, ['side', 'buy', 'sell', 'action', 'type', 'direction', 'buy/sell'])) {
      const confidence = this.validateSideColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Buy/Sell',
          confidence,
          priority: 8,
          reasoning: `Column name "${sourceColumn}" suggests trade direction field`
        };
      }
    }

    // Quantity mappings with priority
    if (this.matchesPattern(lowerColumn, ['quantity', 'qty'])) {
      const confidence = this.validateNumberColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Shares',
          confidence,
          priority: 9, // Higher priority for exact quantity matches
          reasoning: `Column name "${sourceColumn}" suggests order quantity field`
        };
      }
    }
    
    if (this.matchesPattern(lowerColumn, ['shares', 'volume', 'amount', 'size'])) {
      const confidence = this.validateNumberColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Shares',
          confidence,
          priority: 7,
          reasoning: `Column name "${sourceColumn}" suggests quantity field`
        };
      }
    }

    // Date/Time column mappings
    if (this.matchesPattern(lowerColumn, ['datetime', 'orderexecutedtime'])) {
      const confidence = this.validateDateColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Date',
          confidence,
          priority: 9,
          reasoning: `Column name "${sourceColumn}" suggests execution datetime field`
        };
      }
    }
    
    if (this.matchesPattern(lowerColumn, ['date', 'tradedate', 'ordertime'])) {
      const confidence = this.validateDateColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Date',
          confidence,
          priority: 8,
          reasoning: `Column name "${sourceColumn}" suggests date field, validated with sample data`
        };
      }
    }
    
    if (this.matchesPattern(lowerColumn, ['time', 'timestamp', 'when', 'day'])) {
      const confidence = this.validateDateColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Date',
          confidence,
          priority: 6,
          reasoning: `Column name "${sourceColumn}" suggests time field, validated with sample data`
        };
      }
    }

    // Price column mappings with priority
    if (this.matchesPattern(lowerColumn, ['tradeprice', 'limitprice'])) {
      const confidence = this.validateNumberColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Price',
          confidence,
          priority: 8,
          reasoning: `Column name "${sourceColumn}" suggests specific price field`
        };
      }
    }
    
    if (this.matchesPattern(lowerColumn, ['price', 'cost', 'rate', 'value', 'amount'])) {
      const confidence = this.validateNumberColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Price',
          confidence,
          priority: 6,
          reasoning: `Column name "${sourceColumn}" suggests price field`
        };
      }
    }

    // Commission column mapping
    if (this.matchesPattern(lowerColumn, ['commission', 'ibcommission', 'comm', 'fee', 'charge'])) {
      const confidence = this.validateNumberColumn(sampleValues);
      if (confidence > CONFIDENCE_THRESHOLDS.LOW) {
        return {
          sourceColumn,
          targetColumn: 'Commission',
          confidence,
          priority: 7,
          reasoning: `Column name "${sourceColumn}" suggests commission field`
        };
      }
    }

    // Account column mappings with priority
    if (this.matchesPattern(lowerColumn, ['clientaccountid', 'accountid'])) {
      return {
        sourceColumn,
        targetColumn: 'Account',
        confidence: 0.9,
        priority: 8,
        reasoning: `Column name "${sourceColumn}" suggests primary account identifier`
      };
    }
    
    if (this.matchesPattern(lowerColumn, ['account', 'acct', 'portfolio', 'fund', 'accountalias'])) {
      return {
        sourceColumn,
        targetColumn: 'Account',
        confidence: CONFIDENCE_THRESHOLDS.MEDIUM,
        priority: 6,
        reasoning: `Column name "${sourceColumn}" suggests account field`
      };
    }

    return null;
  }

  private matchesPattern(column: string, patterns: string[]): boolean {
    return patterns.some(pattern => column.includes(pattern));
  }

  private validateDateColumn(values: string[]): number {
    if (values.length === 0) return 0;

    const validDates = values.filter(value => {
      try {
        parseDate(value);
        return true;
      } catch {
        return false;
      }
    });

    return validDates.length / values.length;
  }

  private validateSymbolColumn(values: string[]): number {
    if (values.length === 0) return 0;

    // Check if values look like stock symbols (2-5 chars, uppercase)
    const symbolPattern = /^[A-Za-z]{1,5}$/;
    const validSymbols = values.filter(value => symbolPattern.test(value.trim()));

    return Math.min(validSymbols.length / values.length, 0.9);
  }

  private validateSideColumn(values: string[]): number {
    if (values.length === 0) return 0;

    const validSides = values.filter(value => {
      const upper = value.toUpperCase().trim();
      return SIDE_MAPPING[upper] !== undefined;
    });

    return validSides.length / values.length;
  }

  private validateNumberColumn(values: string[]): number {
    if (values.length === 0) return 0;

    const validNumbers = values.filter(value => {
      const parsed = parseNumber(value);
      return parsed !== undefined && !isNaN(parsed);
    });

    return validNumbers.length / values.length;
  }

  private calculateOverallConfidence(mappings: ColumnMapping[]): number {
    if (mappings.length === 0) return 0;

    const weightedSum = mappings.reduce((sum, mapping) => {
      const weight = (REQUIRED_COLUMNS as readonly string[]).includes(mapping.targetColumn) ? 2 : 1;
      return sum + (mapping.confidence * weight);
    }, 0);

    const totalWeight = mappings.reduce((sum, mapping) => {
      return sum + ((REQUIRED_COLUMNS as readonly string[]).includes(mapping.targetColumn) ? 2 : 1);
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private findMissingRequiredColumns(mappings: ColumnMapping[]): string[] {
    const mappedTargets = mappings.map(m => m.targetColumn);
    return REQUIRED_COLUMNS.filter(col => !mappedTargets.includes(col));
  }

  private generateSuggestions(mappings: ColumnMapping[], missingRequired: string[]): string[] {
    const suggestions: string[] = [];

    if (missingRequired.length > 0) {
      suggestions.push(`Missing required columns: ${missingRequired.join(', ')}`);
    }

    const lowConfidenceMappings = mappings.filter(m => m.confidence < CONFIDENCE_THRESHOLDS.MEDIUM);
    if (lowConfidenceMappings.length > 0) {
      suggestions.push(`Please review low-confidence mappings: ${lowConfidenceMappings.map(m => m.sourceColumn).join(', ')}`);
    }

    if (mappings.length === 0) {
      suggestions.push('No column mappings found. Please use our Standard CSV format.');
    }

    return suggestions;
  }

  private fallbackMapping(): AiMappingResult {
    return {
      mappings: [],
      overallConfidence: 0,
      requiresUserReview: true,
      missingRequired: [...REQUIRED_COLUMNS],
      suggestions: [
        'AI mapping service unavailable. Please manually map columns or use Standard CSV format.',
        'Download our Standard CSV template for the expected format.'
      ]
    };
  }

  // Apply user-corrected mappings to transform data
  applyMappings(rows: CustomCsvRow[], mappings: ColumnMapping[], accountTags: string[] = []): NormalizedTrade[] {
    const normalizedTrades: NormalizedTrade[] = [];

    for (const row of rows) {
      try {
        const mappedRow = this.mapRowData(row, mappings);
        const normalizedTrade = this.normalizeCustomRow(mappedRow, accountTags);
        normalizedTrades.push(normalizedTrade);
      } catch (error) {
        console.error('Failed to normalize row:', error, row);
        // Could collect errors for reporting
      }
    }

    return normalizedTrades;
  }

  private mapRowData(row: CustomCsvRow, mappings: ColumnMapping[]): Partial<Record<string, string>> {
    const mappedRow: Partial<Record<string, string>> = {};

    for (const mapping of mappings) {
      if (mapping.targetColumn && row[mapping.sourceColumn]) {
        mappedRow[mapping.targetColumn] = row[mapping.sourceColumn];
      }
    }

    return mappedRow;
  }

  private normalizeCustomRow(mappedRow: Partial<Record<string, string>>, accountTags: string[]): NormalizedTrade {
    const date = mappedRow.Date ? parseDate(mappedRow.Date) : new Date();
    const time = mappedRow.Time || '00:00:00';
    const symbol = (mappedRow.Symbol || '').toUpperCase();
    const sideStr = (mappedRow['Buy/Sell'] || '').toUpperCase();
    const side = SIDE_MAPPING[sideStr];
    const volume = parseNumber(mappedRow.Shares);
    const price = parseNumber(mappedRow.Price);
    const commission = parseNumber(mappedRow.Commission);
    const fees = parseNumber(mappedRow.Fees);

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    if (!side) {
      throw new Error(`Invalid or missing Buy/Sell value: ${sideStr}`);
    }

    if (!volume || volume <= 0) {
      throw new Error(`Invalid or missing Shares value: ${mappedRow.Shares}`);
    }

    return {
      date,
      time,
      symbol,
      side,
      volume,
      price,
      commission,
      fees,
      account: mappedRow.Account,
      pnl: 0,
      notes: 'Imported from Custom CSV with AI mapping',
      tags: ['imported', 'custom-format', 'ai-mapped', ...accountTags],
    };
  }
}