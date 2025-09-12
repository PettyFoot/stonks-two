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

    // Try exact fingerprint match first
    const exactMatch = await prisma.brokerCsvFormat.findFirst({
      where: { headerFingerprint: fingerprint },
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
      // Update usage count and last used
      await prisma.brokerCsvFormat.update({
        where: { id: exactMatch.id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });

      return {
        broker: exactMatch.broker,
        format: exactMatch,
        confidence: 1.0, // 100% confidence for exact header matches
        isExactMatch: true
      };
    }

    // Try partial header matching (for similar but not identical formats)
    const similarFormats = await this.findSimilarFormats(headers);
    
    if (similarFormats.length > 0) {
      const bestMatch = similarFormats[0];
      return {
        broker: bestMatch.broker,
        format: bestMatch,
        confidence: bestMatch.confidence * 0.8, // Reduce confidence for partial match
        isExactMatch: false
      };
    }

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
  private async findSimilarFormats(headers: string[]): Promise<(BrokerCsvFormat & { broker: BrokerWithRelations })[]> {
    // Get all formats and calculate similarity
    const allFormats = await prisma.brokerCsvFormat.findMany({
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
    return scoredFormats
      .filter(f => f.similarity > 0.7)
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
    
    console.log('🏗️ BrokerFormatService.createFormatWithAI called');
    console.log('📊 Headers:', headers);
    console.log('🏢 Broker name:', brokerName);
    console.log('👤 User ID:', userId);
    
    // Find or create the broker
    console.log('🔍 Finding or creating broker...');
    const broker = await this.findOrCreateBroker(brokerName);
    console.log('✅ Broker found/created:', { id: broker.id, name: broker.name });

    // Use OpenAI to analyze the headers
    console.log('🤖 Calling OpenAI service...');
    const aiResult = await this.openAiService.analyzeHeaders({
      csvHeaders: headers,
      sampleData,
      brokerName: broker.name
    });
    console.log('🎯 OpenAI analysis complete, confidence:', (aiResult.overallConfidence * 100).toFixed(1) + '%');

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
   * Generate incremental format name for a broker
   */
  async generateFormatName(brokerId: string, brokerName: string): Promise<string> {
    const existingFormats = await prisma.brokerCsvFormat.findMany({
      where: { brokerId },
      select: { formatName: true }
    });

    // Extract format numbers from existing format names
    const formatNumbers = existingFormats
      .map(format => {
        const match = format.formatName.match(new RegExp(`^${brokerName}\\s+Format\\s+(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    // Find the next available number
    const nextNumber = formatNumbers.length > 0 ? Math.max(...formatNumbers) + 1 : 1;
    
    return `${brokerName} Format ${nextNumber}`;
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