import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { PaymentStatus } from '@prisma/client';
import { 
  normalizePaginationParams, 
  buildOffsetPaginationOptions, 
  createPaginatedResponse 
} from '@/lib/utils/pagination';

/**
 * GET /api/payments
 * Get user's payment history with pagination and filtering
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

    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const status = searchParams.get('status') as PaymentStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const subscriptionId = searchParams.get('subscriptionId');
    
    // Extract pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/payments - User: ${user.id}`, {
        status, dateFrom, dateTo, subscriptionId, page, limit
      });
    }

    // Normalize pagination parameters
    const paginationParams = normalizePaginationParams({ 
      page, 
      limit: Math.min(limit, 100), // Cap at 100 items per page
      sortBy, 
      sortOrder 
    });

    // Build where clause for filters
    const whereClause: Record<string, unknown> = {
      userId: user.id,
    };

    if (status && Object.values(PaymentStatus).includes(status)) {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        (whereClause.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (whereClause.createdAt as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    if (subscriptionId) {
      whereClause.stripeSubscriptionId = subscriptionId;
    }

    // Build pagination options
    const paginationOptions = buildOffsetPaginationOptions(paginationParams);

    // Execute parallel queries for payments and total count
    const [payments, totalCount] = await Promise.all([
      prisma.paymentHistory.findMany({
        where: whereClause,
        select: {
          id: true,
          stripePaymentIntentId: true,
          stripeSubscriptionId: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          receiptUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          [paginationParams.sortBy]: paginationParams.sortOrder
        },
        skip: paginationOptions.skip,
        take: paginationOptions.take
      }),
      prisma.paymentHistory.count({ where: whereClause })
    ]);

    // Get subscription details for each payment (if needed)
    const subscriptionIds = [...new Set(payments
      .map(p => p.stripeSubscriptionId)
      .filter(Boolean)
    )] as string[];

    const subscriptions = subscriptionIds.length > 0 ? await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: { in: subscriptionIds }
      },
      select: {
        stripeSubscriptionId: true,
        tier: true,
        stripePriceId: true,
      }
    }) : [];

    const subscriptionMap = new Map(
      subscriptions.map(sub => [sub.stripeSubscriptionId, sub])
    );

    // Transform payments with enhanced information
    const transformedPayments = payments.map(payment => {
      const subscription = payment.stripeSubscriptionId 
        ? subscriptionMap.get(payment.stripeSubscriptionId)
        : null;

      return {
        id: payment.id,
        paymentIntentId: payment.stripePaymentIntentId,
        subscriptionId: payment.stripeSubscriptionId,
        amount: payment.amount,
        currency: payment.currency.toUpperCase(),
        status: payment.status,
        description: payment.description,
        receiptUrl: payment.receiptUrl,
        date: payment.createdAt,
        updatedAt: payment.updatedAt,
        subscription: subscription ? {
          tier: subscription.tier,
          priceId: subscription.stripePriceId,
        } : null,
        displayAmount: `$${(payment.amount / 100).toFixed(2)}`,
        isSuccessful: payment.status === PaymentStatus.SUCCEEDED,
        isFailed: payment.status === PaymentStatus.FAILED,
        isPending: payment.status === PaymentStatus.PENDING,
        canDownloadReceipt: !!payment.receiptUrl,
      };
    });

    // Calculate summary statistics
    const successfulPayments = transformedPayments.filter(p => p.isSuccessful);
    const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgPaymentAmount = successfulPayments.length > 0 
      ? totalPaid / successfulPayments.length 
      : 0;

    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      transformedPayments,
      paginationParams,
      totalCount,
      (payment) => payment.id
    );

    const response = {
      ...paginatedResponse,
      // Legacy compatibility
      payments: paginatedResponse.data,
      summary: {
        totalPayments: totalCount,
        successfulPayments: successfulPayments.length,
        totalPaid,
        averagePayment: avgPaymentAmount,
        currency: 'USD',
        displayTotalPaid: `$${(totalPaid / 100).toFixed(2)}`,
        displayAveragePayment: `$${(avgPaymentAmount / 100).toFixed(2)}`,
      },
      filters: {
        status,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        subscriptionId,
      },
      availableStatuses: Object.values(PaymentStatus),
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          totalRecords: totalCount,
          pageSize: paginationParams.limit,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/payments completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/payments error:', error);
    
    const errorResponse = {
      error: 'Failed to fetch payment history',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/payments
 * Get detailed payment information from Stripe (for reconciliation)
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

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/payments - User: ${user.id}, PaymentIntentId: ${paymentIntentId}`);
    }

    // Get payment from database
    const payment = await prisma.paymentHistory.findFirst({
      where: {
        userId: user.id,
        stripePaymentIntentId: paymentIntentId,
      },
      select: {
        id: true,
        stripePaymentIntentId: true,
        stripeSubscriptionId: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        receiptUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Get enhanced details from Stripe
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);
    
    try {
      // This would call Stripe API to get detailed payment information
      // For now, we'll return the database information with enhanced formatting
      const detailedPayment = {
        id: payment.id,
        paymentIntentId: payment.stripePaymentIntentId,
        subscriptionId: payment.stripeSubscriptionId,
        amount: payment.amount,
        currency: payment.currency.toUpperCase(),
        status: payment.status,
        description: payment.description,
        receiptUrl: payment.receiptUrl,
        date: payment.createdAt,
        updatedAt: payment.updatedAt,
        displayAmount: `$${(payment.amount / 100).toFixed(2)}`,
        breakdown: {
          subtotal: payment.amount,
          tax: 0, // Would be calculated from Stripe data
          total: payment.amount,
          currency: payment.currency.toUpperCase(),
        },
        paymentMethod: {
          type: 'card', // Would come from Stripe
          last4: '****', // Would come from Stripe
          brand: 'unknown', // Would come from Stripe
        },
        isSuccessful: payment.status === PaymentStatus.SUCCEEDED,
        isFailed: payment.status === PaymentStatus.FAILED,
        isPending: payment.status === PaymentStatus.PENDING,
        canDownloadReceipt: !!payment.receiptUrl,
      };

      const response = {
        payment: detailedPayment,
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            queryTime: Date.now() - startTime,
            userId: user.id,
            paymentId: payment.id,
          }
        })
      };

      return NextResponse.json(response);

    } catch (stripeError) {
      console.error('Failed to get Stripe payment details:', stripeError);
      
      // Return database info even if Stripe call fails
      return NextResponse.json({
        payment: {
          id: payment.id,
          paymentIntentId: payment.stripePaymentIntentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          description: payment.description,
          date: payment.createdAt,
          displayAmount: `$${(payment.amount / 100).toFixed(2)}`,
          stripeDetailsUnavailable: true,
        }
      });
    }

  } catch (error) {
    console.error('[API] POST /api/payments error:', error);
    
    const errorResponse = {
      error: 'Failed to fetch payment details',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Only allow GET and POST methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}