import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { z } from 'zod';

// Request validation schema for profile updates
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  preferences: z.object({
    timezone: z.string().optional(),
    currency: z.string().length(3, 'Currency must be 3 characters').optional(),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      trading: z.boolean().optional(),
      billing: z.boolean().optional(),
      marketing: z.boolean().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/user/profile
 * Get user profile with subscription information
 */
export async function GET(request: NextRequest) {
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

    }

    // Get comprehensive user data with optimized queries
    const [dbUser, currentSubscription, tradeStats] = await Promise.all([
      // User profile data
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          auth0Id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      
      // Current subscription
      prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: { not: SubscriptionStatus.CANCELED }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tier: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          trialStart: true,
          trialEnd: true,
          stripeSubscriptionId: true,
          stripePriceId: true,
        }
      }),

      // Trading statistics
      prisma.trade.aggregate({
        where: { userId: user.id },
        _count: { id: true },
        _sum: { pnl: true, quantity: true },
      })
    ]);

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get subscription display information if subscription exists
    let subscriptionInfo = null;
    if (currentSubscription) {
      const subscriptionManager = createSubscriptionManager(user.id);
      const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();
      
      const isActive = currentSubscription.status === SubscriptionStatus.ACTIVE;
      const isTrial = currentSubscription.trialStart && currentSubscription.trialEnd && 
                     new Date() <= currentSubscription.trialEnd;
      
      let trialDaysRemaining = 0;
      if (isTrial && currentSubscription.trialEnd) {
        const trialEnd = new Date(currentSubscription.trialEnd);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      subscriptionInfo = {
        id: currentSubscription.id,
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        isActive,
        isTrial,
        trialDaysRemaining,
        currentPeriodStart: currentSubscription.currentPeriodStart,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd,
        features: {
          maxTrades: currentSubscription.tier === SubscriptionTier.FREE ? 100 : -1,
          advancedAnalytics: currentSubscription.tier !== SubscriptionTier.FREE,
          dataExport: currentSubscription.tier !== SubscriptionTier.FREE,
          prioritySupport: currentSubscription.tier !== SubscriptionTier.FREE,
          customReports: currentSubscription.tier !== SubscriptionTier.FREE,
        }
      };
    }

    // Calculate current month's trade count for usage tracking
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);

    const monthlyTradeCount = await prisma.trade.count({
      where: {
        userId: user.id,
        date: {
          gte: currentMonth,
          lt: nextMonth,
        }
      }
    });

    // Get account activity summary
    const [firstTrade, lastTrade] = await Promise.all([
      prisma.trade.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        select: { date: true }
      }),
      prisma.trade.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        select: { date: true }
      })
    ]);

    const response = {
      profile: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        auth0Id: dbUser.auth0Id,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        hasStripeCustomer: !!dbUser.stripeCustomerId,
      },
      subscription: subscriptionInfo || {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.INACTIVE,
        isActive: false,
        isTrial: false,
        features: {
          maxTrades: 100,
          advancedAnalytics: false,
          dataExport: false,
          prioritySupport: false,
          customReports: false,
        }
      },
      usage: {
        totalTrades: tradeStats._count.id || 0,
        totalPnL: tradeStats._sum.pnl ? Number(tradeStats._sum.pnl) : 0,
        totalVolume: tradeStats._sum.quantity || 0,
        tradesThisMonth: monthlyTradeCount,
        monthlyLimit: currentSubscription?.tier === SubscriptionTier.FREE ? 100 : -1,
        usagePercentage: currentSubscription?.tier === SubscriptionTier.FREE 
          ? Math.min(100, (monthlyTradeCount / 100) * 100) 
          : 0,
      },
      activity: {
        firstTradeDate: firstTrade?.date || null,
        lastTradeDate: lastTrade?.date || null,
        accountAge: dbUser.createdAt ? 
          Math.floor((new Date().getTime() - dbUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        isNewUser: dbUser.createdAt ? 
          (new Date().getTime() - dbUser.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000) : true,
      },
      preferences: {
        timezone: 'UTC', // Default - can be enhanced later
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        notifications: {
          email: true,
          trading: true,
          billing: true,
          marketing: false,
        }
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: currentSubscription?.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {

    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/user/profile error:', error);
    
    const errorResponse = {
      error: 'Failed to fetch user profile',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update user profile information
 */
export async function PUT(request: NextRequest) {
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

    const validationResult = updateProfileSchema.safeParse(body);
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

    const { name, email, preferences, metadata } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {

    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined && email !== user.email) {
      // Check if email is already in use by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: user.id }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already in use by another account' },
          { status: 409 }
        );
      }

      updateData.email = email;
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      }
    });

    // If we have a Stripe customer and email changed, update Stripe
    if (email && email !== user.email && 'stripeCustomerId' in user && user.stripeCustomerId && typeof user.stripeCustomerId === 'string') {
      try {
        const { customerService } = await import('@/lib/stripe');
        await customerService.updateCustomer(user.stripeCustomerId, {
          email: email,
          name: name || user.name || undefined,
          metadata: {
            userId: user.id,
            lastUpdated: new Date().toISOString(),
            ...metadata
          }
        });
      } catch (stripeError) {
        console.error('Failed to update Stripe customer:', stripeError);
        // Don't fail the entire request for Stripe update failures
      }
    }

    // Log profile update
    if (process.env.NODE_ENV === 'production') {
      console.log('[USER_PROFILE] Profile updated:', {
        userId: user.id,
        emailChanged: email && email !== user.email,
        nameChanged: name && name !== user.name,
      });
    }

    const response = {
      success: true,
      profile: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        updatedAt: updatedUser.updatedAt,
      },
      changes: {
        email: email && email !== user.email ? { from: user.email, to: email } : null,
        name: name && name !== user.name ? { from: user.name, to: name } : null,
      },
      message: 'Profile updated successfully',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          updatedFields: Object.keys(updateData),
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {

    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] PUT /api/user/profile error:', error);
    
    const errorResponse = {
      error: 'Failed to update user profile',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Only allow GET and PUT methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use PUT to update profile.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Account deletion must be handled separately.' },
    { status: 405 }
  );
}