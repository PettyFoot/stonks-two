import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['created', 'confidence', 'pending_count']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * GET /api/admin/formats/pending
 * Get formats pending approval for admin review
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
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
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

    const { limit, offset, sortBy, sortOrder } = validation.data;

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'created':
        orderBy = { createdAt: sortOrder };
        break;
      case 'confidence':
        orderBy = { confidence: sortOrder };
        break;
      case 'pending_count':
        // This will need to be handled with a raw query or subquery
        orderBy = { createdAt: sortOrder }; // Fallback for now
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get unapproved formats with staging counts
    const [formats, total] = await Promise.all([
      prisma.brokerCsvFormat.findMany({
        where: { isApproved: false },
        include: {
          broker: {
            select: {
              id: true,
              name: true
            }
          },
          aiIngestChecks: {
            select: {
              id: true,
              aiConfidence: true,
              userIndicatedError: true,
              adminReviewStatus: true,
              createdAt: true,
              user: {
                select: {
                  email: true,
                  name: true
                }
              }
            }
          },
          orderStaging: {
            where: { migrationStatus: 'PENDING' },
            select: { id: true }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.brokerCsvFormat.count({
        where: { isApproved: false }
      })
    ]);

    // Transform data for frontend
    const transformedFormats = formats.map(format => ({
      id: format.id,
      formatName: format.formatName,
      description: format.description,
      confidence: format.confidence,
      createdAt: format.createdAt,
      broker: {
        id: format.broker.id,
        name: format.broker.name
      },
      headers: format.headers,
      sampleData: format.sampleData,
      fieldMappings: format.fieldMappings,
      pendingOrdersCount: format.orderStaging.length,
      usageCount: format.usageCount,
      aiIngestCheck: format.aiIngestChecks[0] ? {
        id: format.aiIngestChecks[0].id,
        aiConfidence: format.aiIngestChecks[0].aiConfidence,
        userIndicatedError: format.aiIngestChecks[0].userIndicatedError,
        adminReviewStatus: format.aiIngestChecks[0].adminReviewStatus,
        createdAt: format.aiIngestChecks[0].createdAt,
        user: format.aiIngestChecks[0].user
      } : null,
      priority: format.aiIngestChecks[0]?.userIndicatedError ? 'HIGH' :
                format.confidence < 0.7 ? 'MEDIUM' : 'LOW'
    }));

    // Sort by pending count if requested (client-side sorting for now)
    if (sortBy === 'pending_count') {
      transformedFormats.sort((a, b) => {
        const comparison = b.pendingOrdersCount - a.pendingOrdersCount;
        return sortOrder === 'asc' ? -comparison : comparison;
      });
    }

    return NextResponse.json({
      success: true,
      formats: transformedFormats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      summary: {
        totalPendingFormats: total,
        totalPendingOrders: transformedFormats.reduce((sum, f) => sum + f.pendingOrdersCount, 0),
        highPriorityCount: transformedFormats.filter(f => f.priority === 'HIGH').length
      }
    });

  } catch (error) {
    console.error('[API] Get pending formats error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get pending formats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}