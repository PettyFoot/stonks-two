import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { FormatApprovalService } from '@/lib/services/FormatApprovalService';
import { RateLimiter } from '@/lib/security/InputValidator';

interface RouteParams {
  params: Promise<{
    formatId: string;
  }>;
}

const ApprovalSchema = z.object({
  correctedMappings: z.record(z.string(), z.any()).optional(),
  idempotencyKey: z.string().optional(),
  reason: z.string().optional()
});

/**
 * POST /api/admin/formats/[formatId]/approve
 * Approve a CSV format and migrate all staged orders
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formatId } = await params;

    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult; // Return error response
    }
    const admin = adminResult;

    // Check rate limit
    if (!RateLimiter.checkRateLimit(admin.id, 5, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 5 approvals per minute.' },
        { status: 429 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = ApprovalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { correctedMappings, idempotencyKey, reason } = validation.data;

    // Validate formatId
    if (!formatId || typeof formatId !== 'string') {
      return NextResponse.json(
        { error: 'Format ID is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Admin ${admin.email} approving format ${formatId}`);

    // Approve format and migrate orders
    const approvalService = new FormatApprovalService();
    const result = await approvalService.approveFormatAndMigrateOrders(
      formatId,
      admin.id,
      correctedMappings,
      idempotencyKey
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Format approval failed',
          details: result.errors,
          formatId: formatId
        },
        { status: 500 }
      );
    }

    console.log(
      `[API] Format ${formatId} approved successfully: ` +
      `${result.migratedCount} orders migrated in ${result.duration}ms`
    );

    return NextResponse.json({
      success: true,
      formatId: formatId,
      formatName: result.format.formatName,
      migratedCount: result.migratedCount,
      failedCount: result.failedCount,
      duration: result.duration,
      rollbackAvailable: result.rollbackAvailable,
      message: `Format approved successfully. ${result.migratedCount} orders migrated.`
    });

  } catch (error) {
    console.error('[API] Format approval error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Format not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('already approved')) {
        return NextResponse.json(
          { error: 'Format is already approved' },
          { status: 409 }
        );
      }

      if (error.message.includes('timeout') || error.message.includes('lock')) {
        return NextResponse.json(
          { error: 'Another approval is in progress. Please try again in a moment.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Format approval failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/formats/[formatId]/approve
 * Reject a CSV format and mark staged orders as rejected
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formatId } = await params;

    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }
    const admin = adminResult;

    // Parse request body for rejection reason
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Format rejected by admin';

    // Validate formatId
    if (!formatId || typeof formatId !== 'string') {
      return NextResponse.json(
        { error: 'Format ID is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Admin ${admin.email} rejecting format ${formatId}`);

    // Reject format
    const approvalService = new FormatApprovalService();
    const result = await approvalService.rejectFormat(
      formatId,
      admin.id,
      reason
    );

    console.log(`[API] Format ${formatId} rejected: ${result.rejectedCount} orders rejected`);

    return NextResponse.json({
      success: true,
      formatId: formatId,
      rejectedCount: result.rejectedCount,
      reason,
      message: `Format rejected. ${result.rejectedCount} staged orders marked as rejected.`
    });

  } catch (error) {
    console.error('[API] Format rejection error:', error);

    return NextResponse.json(
      {
        error: 'Format rejection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}