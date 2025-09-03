import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { DeletionAction } from '@prisma/client';
import { z } from 'zod';

// Request validation schema for account deletion
const deleteAccountSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters').optional(),
  confirmation: z.literal(true).refine(val => val === true, {
    message: 'You must confirm account deletion'
  }),
  password: z.string().optional(), // For additional security
});

/**
 * POST /api/account/delete
 * Request account deletion (soft delete with grace period)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = deleteAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    const { reason, confirmation } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/account/delete - User: ${user.id}`, { reason });
    }

    // Check if user already requested deletion
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        canReactivate: true,
        email: true,
        name: true
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (existingUser.deletedAt) {
      return NextResponse.json(
        { 
          error: 'Account already deleted',
          canReactivate: existingUser.canReactivate,
          deletedAt: existingUser.deletedAt
        },
        { status: 400 }
      );
    }

    if (existingUser.deletionRequestedAt) {
      return NextResponse.json(
        { 
          error: 'Account deletion already requested',
          requestedAt: existingUser.deletionRequestedAt
        },
        { status: 400 }
      );
    }

    // Calculate grace period end date (30 days from now)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

    // Calculate final deletion date (90 days from now)
    const finalDeletionDate = new Date();
    finalDeletionDate.setDate(finalDeletionDate.getDate() + 90);

    // Start database transaction for account deletion process
    const result = await prisma.$transaction(async (tx) => {
      // Update user with deletion timestamps
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          deletionRequestedAt: new Date(),
          finalDeletionAt: finalDeletionDate,
          deletionReason: reason,
          canReactivate: true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          deletionRequestedAt: true,
          finalDeletionAt: true,
          canReactivate: true
        }
      });

      // Log the deletion request
      await tx.accountDeletionLog.create({
        data: {
          userId: user.id,
          userEmail: existingUser.email,
          action: DeletionAction.REQUESTED,
          performedBy: user.id,
          reason: reason,
          details: {
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            timestamp: new Date().toISOString()
          },
          scheduledFor: gracePeriodEnd
        }
      });

      return updatedUser;
    });

    // Cancel active subscriptions if any
    try {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
        },
        select: {
          stripeSubscriptionId: true
        }
      });

      if (activeSubscription?.stripeSubscriptionId) {
        const { subscriptionService } = await import('@/lib/stripe');
        await subscriptionService.cancelSubscriptionImmediately(activeSubscription.stripeSubscriptionId);

        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Cancelled subscription for deleted user: ${user.id}`);
        }
      }
    } catch (stripeError) {
      console.error('Failed to cancel Stripe subscription during account deletion:', stripeError);
      // Don't fail the entire deletion process for Stripe errors
    }

    // Log successful deletion request
    if (process.env.NODE_ENV === 'production') {
      console.log(`[ACCOUNT_DELETION] User ${user.id} requested account deletion`, {
        reason: reason,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        finalDeletionDate: finalDeletionDate.toISOString(),
      });
    }

    const response = {
      success: true,
      message: 'Account deletion requested successfully',
      deletion: {
        requestedAt: result.deletionRequestedAt,
        gracePeriodEnd: gracePeriodEnd,
        finalDeletionAt: result.finalDeletionAt,
        canReactivate: result.canReactivate,
        reactivationUrl: `${process.env.AUTH0_BASE_URL}/api/auth/login?returnTo=${encodeURIComponent(process.env.AUTH0_BASE_URL + '/account/reactivate')}`
      },
      nextSteps: {
        gracePeriod: '30 days to reactivate by logging in',
        dataRetention: 'Personal data will be anonymized after 30 days',
        finalDeletion: 'Complete deletion after 90 days',
        support: 'Contact support if you need assistance'
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          finalDeletionDate: finalDeletionDate.toISOString(),
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/account/delete completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/account/delete error:', error);
    
    const errorResponse = {
      error: 'Failed to process account deletion request',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/account/delete
 * Cancel pending account deletion (reactivate account)
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] DELETE /api/account/delete - User: ${user.id} (reactivation)`);
    }

    // Check current user status
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        canReactivate: true,
        email: true,
        finalDeletionAt: true
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!existingUser.deletionRequestedAt && !existingUser.deletedAt) {
      return NextResponse.json(
        { error: 'No pending account deletion found' },
        { status: 400 }
      );
    }

    if (existingUser.deletedAt && !existingUser.canReactivate) {
      return NextResponse.json(
        { error: 'Account cannot be reactivated - deletion process has progressed beyond grace period' },
        { status: 400 }
      );
    }

    // Check if still within grace period
    if (existingUser.finalDeletionAt && new Date() > existingUser.finalDeletionAt) {
      return NextResponse.json(
        { error: 'Grace period has expired - account cannot be reactivated' },
        { status: 400 }
      );
    }

    // Reactivate account
    const result = await prisma.$transaction(async (tx) => {
      // Clear deletion fields
      const reactivatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          deletionRequestedAt: null,
          deletedAt: null,
          deletionReason: null,
          finalDeletionAt: null,
          canReactivate: true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          updatedAt: true
        }
      });

      // Log the reactivation
      await tx.accountDeletionLog.create({
        data: {
          userId: user.id,
          userEmail: existingUser.email,
          action: DeletionAction.REACTIVATED,
          performedBy: user.id,
          details: {
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            timestamp: new Date().toISOString(),
            reactivatedAt: new Date().toISOString()
          }
        }
      });

      return reactivatedUser;
    });

    // Log successful reactivation
    if (process.env.NODE_ENV === 'production') {
      console.log(`[ACCOUNT_REACTIVATION] User ${user.id} reactivated account`);
    }

    const response = {
      success: true,
      message: 'Account reactivated successfully',
      reactivation: {
        reactivatedAt: result.updatedAt,
        userId: result.id,
        email: result.email
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] DELETE /api/account/delete completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] DELETE /api/account/delete error:', error);
    
    const errorResponse = {
      error: 'Failed to reactivate account',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/account/delete
 * Get account deletion status
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user deletion status
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        deletionReason: true,
        finalDeletionAt: true,
        canReactivate: true
      }
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get deletion logs
    const deletionLogs = await prisma.accountDeletionLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        action: true,
        reason: true,
        createdAt: true,
        scheduledFor: true,
        completedAt: true
      },
      take: 10
    });

    const isDeleted = !!userData.deletedAt;
    const isDeletionRequested = !!userData.deletionRequestedAt;
    const canReactivate = userData.canReactivate && 
      userData.finalDeletionAt && 
      new Date() < userData.finalDeletionAt;

    let daysUntilFinalDeletion = 0;
    if (userData.finalDeletionAt) {
      const diffTime = userData.finalDeletionAt.getTime() - new Date().getTime();
      daysUntilFinalDeletion = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const response = {
      status: {
        isDeleted,
        isDeletionRequested,
        canReactivate,
        deletionRequestedAt: userData.deletionRequestedAt,
        deletedAt: userData.deletedAt,
        finalDeletionAt: userData.finalDeletionAt,
        daysUntilFinalDeletion,
        reason: userData.deletionReason
      },
      timeline: {
        gracePeriod: isDeletionRequested ? '30 days from request' : null,
        anonymization: isDeletionRequested ? '30 days after request' : null,
        finalDeletion: isDeletionRequested ? '90 days after request' : null
      },
      logs: deletionLogs
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/account/delete error:', error);
    return NextResponse.json(
      { error: 'Failed to get account deletion status' },
      { status: 500 }
    );
  }
}

// Only allow GET, POST, and DELETE methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to request deletion or DELETE to cancel.' },
    { status: 405 }
  );
}