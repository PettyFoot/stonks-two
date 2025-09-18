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



    // Get the actual database user ID from Auth0 ID
    const dbUser = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { id: true, email: true }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database. Please ensure you are logged in properly.' },
        { status: 404 }
      );
    }



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

    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];


    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found. Please connect a broker account.' },
        { status: 400 }
      );
    }

    // Step 2: Use first account for testing
    const testAccount = accounts[0];


    // Step 3: Get activities with hardcoded parameters

    const testParams = {
      startDate: '2015-01-01',
      endDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      limit: 10,
      type: 'BUY,SELL'
    };



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



    const activitiesData = activitiesResponse.data;
    const activities: AccountUniversalActivity[] = (activitiesData && 'data' in activitiesData) 
      ? (activitiesData.data || []) 
      : [];



    activities.forEach((activity, index: number) => {
      console.log(`[SNAPTRADE_TEST] Activity ${index + 1}:`, {
        id: activity.id,
        type: activity.type,
        symbol: activity.symbol?.symbol,
        units: activity.units, // Note: AccountUniversalActivity uses 'units' not 'quantity'
        price: activity.price,
        trade_date: activity.trade_date,
        institution: activity.institution
      });
    });

    // Step 4: Test process activities through new test method

    
    const processor = new SnapTradeActivityProcessor();
    const testResult = await processor.testProcessActivities(
      activities, // Use the activities we already fetched
      { 
        id: testAccount.id, 
        name: testAccount.name || 'Unknown Account',
        number: testAccount.number 
      },
      dbUser.id, // Use the proper database user ID
      dbUser.id, // connectionId (using database user ID)
      (progress, message) => {

      }
    );



    // Step 5: Note - orders are NOT saved to database in test mode





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
        activitiesFound: testResult.activitiesFound,
        ordersWouldBeCreated: testResult.ordersWouldBeCreated,
        duplicatesSkipped: testResult.duplicatesSkipped,
        errors: testResult.errors,
        success: testResult.success
      },
      ordersData: testResult.ordersData.map(order => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        orderType: order.orderType,
        orderQuantity: order.orderQuantity,
        limitPrice: order.limitPrice?.toString(),
        orderExecutedTime: order.orderExecutedTime?.toISOString(),
        snapTradeActivityId: order.snapTradeActivityId,
        brokerType: order.brokerType,
        brokerMetadata: order.brokerMetadata
      })),
      summary: {
        accountsAvailable: accounts.length,
        activitiesFromAPI: activities.length,
        ordersWouldBeProcessed: testResult.ordersWouldBeCreated,
        testMode: true,
        note: 'Orders were not saved to database - this is test mode',
        ordersAsTheyWouldAppearInDatabase: testResult.ordersData
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