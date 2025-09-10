import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from '@/lib/snaptrade/client';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';
import { SnapTradeActivityProcessor } from '@/lib/snaptrade/activityProcessor';
import { prisma } from '@/lib/prisma';
import { AccountUniversalActivity } from 'snaptrade-typescript-sdk';

// GET - Test SnapTrade integration with hardcoded parameters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('=== Starting SnapTrade Integration Test ===');

    // Get user's SnapTrade credentials
    const credentials = await getSnapTradeCredentials(session.user.sub);
    if (!credentials) {
      return NextResponse.json(
        { error: 'SnapTrade credentials not found. Please connect a broker first.' },
        { status: 400 }
      );
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Step 1: Get user accounts
    console.log('Step 1: Fetching user accounts...');
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];
    console.log(`Found ${accounts.length} accounts:`, accounts.map(acc => ({ id: acc.id, name: acc.name })));

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found. Please connect a broker account.' },
        { status: 400 }
      );
    }

    // Step 2: Use first account for testing
    const testAccount = accounts[0];
    console.log(`Using account for testing:`, { id: testAccount.id, name: testAccount.name });

    // Step 3: Get activities with hardcoded parameters
    console.log('Step 2: Fetching activities with test parameters...');
    const testParams = {
      startDate: '2010-01-01',
      endDate: '2025-09-02', 
      limit: 10,
      type: 'BUY,SELL'
    };

    console.log('Test parameters:', testParams);

    await RateLimitHelper.checkRateLimit();
    const activitiesResponse = await client.accountInformation.getAccountActivities({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
      accountId: testAccount.id,
      startDate: testParams.startDate,
      endDate: testParams.endDate,
      limit: testParams.limit,
      type: testParams.type
    });

    console.log('Raw SnapTrade API Response:', JSON.stringify(activitiesResponse.data, null, 2));

    const activitiesData = activitiesResponse.data;
    const activities: AccountUniversalActivity[] = (activitiesData && 'data' in activitiesData) 
      ? (activitiesData.data || []) 
      : [];

    console.log(`Step 3: Found ${activities.length} activities`);
    console.log('Activities details:');
    activities.forEach((activity, index: number) => {
      console.log(`Activity ${index + 1}:`, {
        id: activity.id,
        type: activity.type,
        symbol: activity.symbol?.symbol,
        units: activity.units, // Note: AccountUniversalActivity uses 'units' not 'quantity'
        price: activity.price,
        trade_date: activity.trade_date,
        institution: activity.institution
      });
    });

    // Step 4: Process activities through SnapTradeActivityProcessor
    console.log('Step 4: Processing activities through ActivityProcessor...');
    
    const processor = new SnapTradeActivityProcessor();
    const result = await processor.processActivities(
      session.user.sub, // connectionId (using userId)
      session.user.sub, // userId
      {
        dateFrom: new Date('2010-01-01'),
        dateTo: new Date('2025-09-02'),
        onProgress: (progress, message) => {
          console.log(`Processing progress: ${progress}% - ${message}`);
        }
      }
    );

    console.log('Processing result:', result);

    // Step 5: Get the orders that were created from these activities
    const createdOrders = await prisma.order.findMany({
      where: {
        userId: session.user.sub,
        orderExecutedTime: {
          gte: new Date('2010-01-01'),
          lte: new Date('2025-09-02')
        }
      },
      orderBy: {
        orderExecutedTime: 'desc'
      },
      take: 20 // Get recent orders to show what was created
    });

    console.log('Step 5: Orders in database (recent 20):');
    createdOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        id: order.id,
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        orderQuantity: order.orderQuantity,
        limitPrice: order.limitPrice?.toString(),
        orderExecutedTime: order.orderExecutedTime,
        snapTradeActivityId: order.snapTradeActivityId,
        brokerType: order.brokerType
      });
    });

    console.log('=== SnapTrade Integration Test Complete ===');

    return NextResponse.json({
      success: true,
      testParameters: testParams,
      account: {
        id: testAccount.id,
        name: testAccount.name,
        type: testAccount.type
      },
      rawActivities: activities,
      processingResult: {
        activitiesFound: result.activitiesFound,
        ordersCreated: result.ordersCreated,
        duplicatesSkipped: result.duplicatesSkipped,
        errors: result.errors,
        success: result.success
      },
      ordersInDatabase: createdOrders.map(order => ({
        id: order.id,
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        orderQuantity: order.orderQuantity,
        limitPrice: order.limitPrice?.toString(),
        orderExecutedTime: order.orderExecutedTime?.toISOString(),
        snapTradeActivityId: order.snapTradeActivityId,
        brokerType: order.brokerType
      })),
      summary: {
        accountsAvailable: accounts.length,
        activitiesFromAPI: activities.length,
        ordersProcessed: result.ordersCreated,
        totalOrdersInDB: createdOrders.length
      }
    });

  } catch (error) {
    console.error('SnapTrade integration test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to test integration',
        success: false,
      },
      { status: 500 }
    );
  }
}