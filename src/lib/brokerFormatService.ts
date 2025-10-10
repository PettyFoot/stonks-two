import { prisma } from '@/lib/prisma';
import { OpenAiMappingService, OpenAiMappingResult } from '@/lib/ai/openAiMappingService';
import type { Broker, BrokerAlias, BrokerCsvFormat } from '@prisma/client';

// Extended broker with relations
export interface BrokerWithRelations extends Broker {
  aliases: BrokerAlias[];
  csvFormats: BrokerCsvFormat[];
}

// Format detection result
export interface FormatDetectionResult {
  broker: BrokerWithRelations | null;
  format: BrokerCsvFormat | null;
  confidence: number;
  isExactMatch: boolean;
}

// CSV format creation data
export interface CreateFormatData {
  brokerId: string;
  formatName: string;
  description?: string;
  headers: string[];
  sampleData?: Record<string, unknown>[];
  fieldMappings: Record<string, any>;
  confidence: number;
  createdBy?: string;
}

export class BrokerFormatService {
  private openAiService: OpenAiMappingService;

  constructor() {
    this.openAiService = new OpenAiMappingService();
  }

  /**
   * Find or create a broker by name or alias
   */
  async findOrCreateBroker(brokerName: string): Promise<BrokerWithRelations> {
    const normalizedName = brokerName.trim();

    // First try to find by exact name
    let broker = await prisma.broker.findUnique({
      where: { name: normalizedName },
      include: {
        aliases: true,
        csvFormats: {
          orderBy: { usageCount: 'desc' }
        }
      }
    });

    if (broker) {
      return broker;
    }

    // Try to find by alias
    const aliasResult = await prisma.brokerAlias.findUnique({
      where: { alias: normalizedName },
      include: {
        broker: {
          include: {
            aliases: true,
            csvFormats: {
              orderBy: { usageCount: 'desc' }
            }
          }
        }
      }
    });

    if (aliasResult) {
      return aliasResult.broker;
    }

    // Create new broker if not found
    broker = await prisma.broker.create({
      data: {
        name: normalizedName,
      },
      include: {
        aliases: true,
        csvFormats: true
      }
    });

    return broker;
  }

  /**
   * Add an alias to an existing broker
   */
  async addBrokerAlias(brokerId: string, alias: string): Promise<BrokerAlias> {
    try {
      return await prisma.brokerAlias.create({
        data: {
          brokerId,
          alias: alias.trim()
        }
      });
    } catch (error) {
      // Handle unique constraint violation (alias already exists)
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new Error(`Alias "${alias}" already exists for another broker`);
      }
      throw error;
    }
  }

  /**
   * Search for brokers by name or alias (fuzzy search)
   */
  async searchBrokers(query: string): Promise<BrokerWithRelations[]> {
    const normalizedQuery = query.toLowerCase().trim();

    const brokers = await prisma.broker.findMany({
      where: {
        OR: [
          {
            name: {
              contains: normalizedQuery,
              mode: 'insensitive'
            }
          },
          {
            aliases: {
              some: {
                alias: {
                  contains: normalizedQuery,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      },
      include: {
        aliases: true,
        csvFormats: {
          orderBy: { usageCount: 'desc' }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return brokers;
  }

  /**
   * Detect CSV format by headers - check existing formats first
   */
  async detectFormat(headers: string[]): Promise<FormatDetectionResult> {
    const fingerprint = this.openAiService.generateHeaderFingerprint(headers);

    // DEBUG LOGGING
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[FORMAT DETECTION] Uploaded file analysis:');
    console.log('  Header count:', headers.length);
    console.log('  Headers:', headers.join(', '));
    console.log('  Fingerprint:', fingerprint.substring(0, 60) + '...');
    console.log('═══════════════════════════════════════════════════════════');

    // Try exact fingerprint match first - check all formats (approved and unapproved)
    const exactMatch = await prisma.brokerCsvFormat.findFirst({
      where: {
        headerFingerprint: fingerprint
        // Removed isApproved filter - let downstream logic handle approval routing
      },
      include: {
        broker: {
          include: {
            aliases: true,
            csvFormats: true
          }
        }
      },
      orderBy: { usageCount: 'desc' }
    });

    if (exactMatch) {
      console.log('[FORMAT DETECTION] Found potential exact match:');
      console.log('  Format name:', exactMatch.formatName);
      console.log('  Format ID:', exactMatch.id);
      console.log('  Stored header count:', exactMatch.headers.length);
      console.log('  Stored headers:', exactMatch.headers.join(', '));
      console.log('  Stored fingerprint:', exactMatch.headerFingerprint.substring(0, 60) + '...');
      console.log('  Fingerprints match?', exactMatch.headerFingerprint === fingerprint);
      console.log('  Header counts match?', exactMatch.headers.length === headers.length);

      // Verify header count matches to prevent false positives
      // (fingerprints could theoretically collide, or stored format might have different column count)
      if (exactMatch.headers.length !== headers.length) {
        console.log('  ❌ REJECTING: Header count mismatch');
        console.log('═══════════════════════════════════════════════════════════');
        // Don't use this match, fall through to similarity matching
      } else {
        console.log('  ✅ ACCEPTING: Exact match confirmed');
        console.log('═══════════════════════════════════════════════════════════');
        // Only update usage count for approved formats
        if (exactMatch.isApproved) {
          await prisma.brokerCsvFormat.update({
            where: { id: exactMatch.id },
            data: {
              usageCount: { increment: 1 },
              lastUsed: new Date()
            }
          });
        }

        return {
          broker: exactMatch.broker,
          format: exactMatch,
          confidence: 1.0, // 100% confidence for exact header matches
          isExactMatch: true
        };
      }
    }

    // Try partial header matching (for similar but not identical formats)
    const similarFormats = await this.findSimilarFormats(headers);

    console.log('[FORMAT DETECTION] Partial matching results:');
    console.log('  Similar formats found:', similarFormats.length);

    if (similarFormats.length > 0) {
      const bestMatch = similarFormats[0];
      const calculatedConfidence = bestMatch.similarity * 0.8;

      console.log('  Best match:');
      console.log('    Format name:', bestMatch.formatName);
      console.log('    Stored header count:', bestMatch.headers.length);
      console.log('    Jaccard similarity:', bestMatch.similarity.toFixed(3));
      console.log('    Final confidence:', calculatedConfidence.toFixed(3));
      console.log('═══════════════════════════════════════════════════════════');

      return {
        broker: bestMatch.broker,
        format: bestMatch,
        confidence: calculatedConfidence, // Use calculated similarity, not stored confidence
        isExactMatch: false
      };
    }

    console.log('  ❌ No matches found (similarity threshold not met)');
    console.log('═══════════════════════════════════════════════════════════');

    return {
      broker: null,
      format: null,
      confidence: 0,
      isExactMatch: false
    };
  }

  /**
   * Find similar formats by comparing headers
   */
  private async findSimilarFormats(headers: string[]): Promise<(BrokerCsvFormat & { broker: BrokerWithRelations; similarity: number })[]> {
    // Get all formats (approved and unapproved) and calculate similarity
    const allFormats = await prisma.brokerCsvFormat.findMany({
      // Removed isApproved filter - let downstream logic handle approval routing
      include: {
        broker: {
          include: {
            aliases: true,
            csvFormats: true
          }
        }
      }
    });

    const scoredFormats = allFormats.map(format => {
      const similarity = this.calculateHeaderSimilarity(headers, format.headers);
      return {
        ...format,
        similarity
      };
    });

    // Return formats with similarity > 0.7, sorted by similarity
    // IMPORTANT: Reject matches where uploaded file has MORE columns than stored format
    // This ensures files with extra unmapped columns trigger AI mapping for new format creation
    return scoredFormats
      .filter(f => {
        const hasExtraColumns = headers.length > f.headers.length;
        return f.similarity > 0.7 && !hasExtraColumns;
      })
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two header arrays
   */
  private calculateHeaderSimilarity(headers1: string[], headers2: string[]): number {
    const set1 = new Set(headers1.map(h => h.toLowerCase().trim()));
    const set2 = new Set(headers2.map(h => h.toLowerCase().trim()));
    
    const intersection = new Set([...set1].filter(h => set2.has(h)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Create a new CSV format mapping using OpenAI
   */
  async createFormatWithAI(
    headers: string[], 
    sampleData: Record<string, unknown>[], 
    brokerName: string,
    userId?: string
  ): Promise<{ format: BrokerCsvFormat; aiResult: OpenAiMappingResult }> {
    
    
    // Find or create the broker
    const broker = await this.findOrCreateBroker(brokerName);


    // Use OpenAI to analyze the headers
    const aiResult = await this.openAiService.analyzeHeaders({
      csvHeaders: headers,
      sampleData,
      brokerName: broker.name
    });

    // Create the format
    const formatName = await this.generateFormatName(broker.id, broker.name);
    const formatData: CreateFormatData = {
      brokerId: broker.id,
      formatName,
      description: `Auto-generated format for ${broker.name}`,
      headers,
      sampleData: sampleData.slice(0, 3), // Store first 3 rows as sample
      fieldMappings: aiResult.mappings,
      confidence: aiResult.overallConfidence,
      createdBy: userId
    };

    const format = await this.createFormat(formatData);

    return { format, aiResult };
  }

  /**
   * Generate format name with random 4-digit number for a broker
   */
  async generateFormatName(brokerId: string, brokerName: string): Promise<string> {
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;
    const formatName = `${brokerName} Format ${randomNumber}`;





    // Check if this format name already exists for this broker
    const existingFormat = await prisma.brokerCsvFormat.findFirst({
      where: {
        brokerId: brokerId,
        formatName: formatName
      }
    });

    if (existingFormat) {

      // Try up to 5 times to generate a unique name
      for (let attempt = 0; attempt < 5; attempt++) {
        const newRandomNumber = Math.floor(Math.random() * 9000) + 1000;
        const newFormatName = `${brokerName} Format ${newRandomNumber}`;

        const conflictCheck = await prisma.brokerCsvFormat.findFirst({
          where: {
            brokerId: brokerId,
            formatName: newFormatName
          }
        });

        if (!conflictCheck) {

          return newFormatName;
        }
      }
      // If we still have conflicts, append timestamp as fallback
      const timestamp = Date.now().toString().slice(-4);
      const fallbackName = `${brokerName} Format ${timestamp}`;

      return fallbackName;
    }

    return formatName;
  }

  /**
   * Create a new CSV format in the database
   */
  async createFormat(data: CreateFormatData): Promise<BrokerCsvFormat> {
    const fingerprint = this.openAiService.generateHeaderFingerprint(data.headers);

    try {
      const format = await prisma.brokerCsvFormat.create({
        data: {
          brokerId: data.brokerId,
          formatName: data.formatName,
          description: data.description,
          headerFingerprint: fingerprint,
          headers: data.headers,
          sampleData: data.sampleData as any || [],
          fieldMappings: data.fieldMappings,
          confidence: data.confidence,
          createdBy: data.createdBy,
          usageCount: 1, // Start with 1 since it's being used
          lastUsed: new Date()
        }
      });

      return format;
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new Error('A format with these headers already exists for this broker');
      }
      throw error;
    }
  }

  /**
   * Update format usage statistics
   */
  async updateFormatUsage(formatId: string, success: boolean = true): Promise<void> {
    const format = await prisma.brokerCsvFormat.findUnique({
      where: { id: formatId }
    });

    if (!format) return;

    // Calculate new success rate
    const totalUsage = format.usageCount + 1;
    const successfulUsage = Math.round(format.successRate * format.usageCount) + (success ? 1 : 0);
    const newSuccessRate = successfulUsage / totalUsage;

    await prisma.brokerCsvFormat.update({
      where: { id: formatId },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date(),
        successRate: newSuccessRate
      }
    });
  }

  /**
   * Get all brokers with their formats
   */
  async getAllBrokers(): Promise<BrokerWithRelations[]> {
    return await prisma.broker.findMany({
      include: {
        aliases: true,
        csvFormats: {
          orderBy: [
            { usageCount: 'desc' },
            { lastUsed: 'desc' }
          ]
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get popular CSV formats across all brokers
   */
  async getPopularFormats(limit: number = 10): Promise<(BrokerCsvFormat & { broker: Broker })[]> {
    return await prisma.brokerCsvFormat.findMany({
      include: {
        broker: true
      },
      orderBy: [
        { usageCount: 'desc' },
        { successRate: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Delete a CSV format
   */
  async deleteFormat(formatId: string): Promise<void> {
    await prisma.brokerCsvFormat.delete({
      where: { id: formatId }
    });
  }

  /**
   * Get format statistics
   */
  async getFormatStats(): Promise<{
    totalBrokers: number;
    totalFormats: number;
    avgFormatsPerBroker: number;
    avgSuccessRate: number;
  }> {
    const [brokerCount, formatCount, avgStats] = await Promise.all([
      prisma.broker.count(),
      prisma.brokerCsvFormat.count(),
      prisma.brokerCsvFormat.aggregate({
        _avg: {
          successRate: true,
          usageCount: true
        }
      })
    ]);

    return {
      totalBrokers: brokerCount,
      totalFormats: formatCount,
      avgFormatsPerBroker: brokerCount > 0 ? formatCount / brokerCount : 0,
      avgSuccessRate: avgStats._avg.successRate || 0
    };
  }
}