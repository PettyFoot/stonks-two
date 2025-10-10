import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QuerySchema = z.object({
  status: z.enum(['PENDING', 'FAILED', 'MIGRATED', 'REJECTED']).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default(20),
  formatId: z.string().optional()
});

/**
 * GET /api/admin/staging/errors
 * Get detailed error information for failed or pending staging records
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validation = QuerySchema.safeParse({
      status: searchParams.get('status'),
      limit: searchParams.get('limit') || '20',
      formatId: searchParams.get('formatId')
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { status, limit, formatId } = validation.data;

    // Build where clause
    const where: any = {};

    if (status) {
      where.migrationStatus = status;
    } else {
      // Default to failed or pending if no status specified
      where.migrationStatus = { in: ['FAILED', 'PENDING'] };
    }

    if (formatId) {
      where.brokerCsvFormatId = formatId;
    }

    // Get staging records with errors
    const stagingRecords = await prisma.orderStaging.findMany({
      where,
      include: {
        brokerCsvFormat: {
          select: {
            id: true,
            formatName: true,
            fieldMappings: true,
            isApproved: true,
            broker: {
              select: {
                name: true
              }
            }
          }
        },
        importBatch: {
          select: {
            id: true,
            filename: true,
            status: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Format the response with diagnostic information
    const diagnosticRecords = stagingRecords.map(record => {
      const mappedData = record.initialMappedData as any;
      const rawData = record.rawCsvRow as any;

      return {
        id: record.id,
        status: record.migrationStatus,
        rowIndex: record.rowIndex,
        createdAt: record.createdAt,

        // User and batch info
        user: {
          id: record.user.id,
          email: record.user.email,
          name: record.user.name
        },
        importBatch: {
          id: record.importBatch.id,
          filename: record.importBatch.filename,
          status: record.importBatch.status
        },

        // Format info
        format: {
          id: record.brokerCsvFormat.id,
          name: record.brokerCsvFormat.formatName,
          broker: record.brokerCsvFormat.broker.name,
          isApproved: record.brokerCsvFormat.isApproved,
          mappings: record.brokerCsvFormat.fieldMappings
        },

        // Data for debugging
        rawCsvRow: rawData,
        initialMappedData: mappedData,
        processingErrors: record.processingErrors,

        // Validation analysis
        validationIssues: analyzeValidationIssues(rawData, mappedData, record.brokerCsvFormat.fieldMappings as any),

        // Retry info
        retryCount: record.retryCount,
        lastRetryAt: record.lastRetryAt,
        processingDurationMs: record.processingDurationMs
      };
    });

    // Get summary statistics
    const stats = await prisma.orderStaging.groupBy({
      by: ['migrationStatus'],
      _count: true,
      where: formatId ? { brokerCsvFormatId: formatId } : undefined
    });

    return NextResponse.json({
      success: true,
      records: diagnosticRecords,
      count: diagnosticRecords.length,
      stats: stats.map(s => ({
        status: s.migrationStatus,
        count: s._count
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Admin staging errors endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get staging error details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze validation issues in staging data
 */
function analyzeValidationIssues(rawData: any, mappedData: any, fieldMappings: any) {
  const issues: string[] = [];

  // Check required fields
  const requiredFields = ['symbol', 'quantity', 'side', 'orderPlacedTime'];

  for (const field of requiredFields) {
    if (!mappedData || !mappedData[field]) {
      issues.push(`Missing required field: ${field}`);

      // Try to find which CSV column should map to this field
      const mappingEntry = Object.entries(fieldMappings || {}).find(([_, mapping]: [string, any]) => {
        if (typeof mapping === 'string') return mapping === field;
        if (typeof mapping === 'object' && mapping !== null) {
          return mapping.field === field || (mapping.fields && mapping.fields.includes(field));
        }
        return false;
      });

      if (mappingEntry) {
        const [csvColumn, mapping] = mappingEntry;
        const rawValue = rawData[csvColumn];
        issues.push(`  → CSV column "${csvColumn}" has value: "${rawValue || '(empty)'}"`);
      } else {
        issues.push(`  → No CSV column mapped to "${field}"`);
      }
    }
  }

  // Check date format issues
  if (mappedData?.orderPlacedTime) {
    const date = new Date(mappedData.orderPlacedTime);
    if (isNaN(date.getTime())) {
      issues.push(`Invalid date format for orderPlacedTime: "${mappedData.orderPlacedTime}"`);
    }
  }

  if (mappedData?.orderExecutedTime) {
    const date = new Date(mappedData.orderExecutedTime);
    if (isNaN(date.getTime())) {
      issues.push(`Invalid date format for orderExecutedTime: "${mappedData.orderExecutedTime}"`);
    }
  }

  // Check symbol format
  if (mappedData?.symbol) {
    const symbol = String(mappedData.symbol).toUpperCase().trim();
    const validPattern = /^[A-Z0-9\-\.]{1,12}$/;
    if (!validPattern.test(symbol)) {
      issues.push(`Invalid symbol format: "${mappedData.symbol}" (must be 1-12 alphanumeric, dots, or hyphens)`);
    }
  }

  // Check quantity
  if (mappedData?.quantity !== undefined) {
    const qty = Number(mappedData.quantity);
    if (isNaN(qty) || qty === 0) {
      issues.push(`Invalid quantity: "${mappedData.quantity}" (must be a non-zero number)`);
    }
  }

  // Check side
  if (mappedData?.side) {
    const validSides = ['BUY', 'SELL', 'BOT', 'SLD', 'B', 'S', 'BOUGHT', 'SOLD', 'YOU BOUGHT', 'YOU SOLD'];
    const normalizedSide = String(mappedData.side).toUpperCase().trim();
    if (!validSides.includes(normalizedSide)) {
      issues.push(`Invalid side value: "${mappedData.side}" (must be BUY, SELL, or variants)`);
    }
  }

  return issues;
}
