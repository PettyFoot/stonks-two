import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { accountDeletionService } from '@/lib/services/accountDeletion';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/users/delete-immediate
 * Immediately delete a user account (admin only)
 *
 * This endpoint allows administrators to immediately delete a user account,
 * bypassing the normal 30-day grace period. This should only be used for
 * security purposes when immediate account removal is required.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify admin authentication
    const adminUser = await requireAdminAuth();

    // Parse request body
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid userId',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Prevent admin from deleting their own account
    if (adminUser.id === userId) {
      return NextResponse.json(
        {
          error: 'Cannot delete your own admin account',
          code: 'CANNOT_DELETE_SELF'
        },
        { status: 403 }
      );
    }

    // Verify the user exists and get their details for logging
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        subscriptionTier: true,
        _count: {
          select: {
            trades: true,
            orders: true,
            importBatches: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Log the admin action before deletion
    console.log(`[IMMEDIATE_DELETION] Admin ${adminUser.email} (${adminUser.id}) is deleting user ${targetUser.email} (${userId})`);
    console.log(`[IMMEDIATE_DELETION] Target user data: ${targetUser._count.trades} trades, ${targetUser._count.orders} orders, ${targetUser._count.importBatches} imports`);

    // Perform the immediate deletion
    await accountDeletionService.immediateDelete(
      userId,
      adminUser.id,
      reason || `Immediate admin deletion by ${adminUser.email}`
    );

    const response = {
      success: true,
      message: 'User account deleted immediately',
      deletedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        wasAdmin: targetUser.isAdmin,
        subscriptionTier: targetUser.subscriptionTier,
        dataDeleted: {
          trades: targetUser._count.trades,
          orders: targetUser._count.orders,
          importBatches: targetUser._count.importBatches
        }
      },
      performedBy: {
        id: adminUser.id,
        email: adminUser.email
      },
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          reason: reason || 'No reason provided',
          processingTimeMs: Date.now() - startTime
        }
      })
    };

    console.log(`[IMMEDIATE_DELETION] Successfully deleted user ${targetUser.email} in ${Date.now() - startTime}ms`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/admin/users/delete-immediate error:', error);

    // Handle specific error types
    let errorMessage = 'Failed to delete user account';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message === 'User not found') {
        errorMessage = 'User not found';
        statusCode = 404;
      } else if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        errorMessage = error.message;
        statusCode = error.message === 'Authentication required' ? 401 : 403;
      }
    }

    const errorResponse = {
      error: errorMessage,
      code: 'DELETION_FAILED',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to delete a user immediately.',
      allowedMethods: ['POST']
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to delete a user immediately.',
      allowedMethods: ['POST']
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to delete a user immediately.',
      allowedMethods: ['POST']
    },
    { status: 405 }
  );
}