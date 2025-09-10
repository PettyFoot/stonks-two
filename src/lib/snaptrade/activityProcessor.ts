import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from './client';
import { prisma } from '@/lib/prisma';
import { SnapTradeActivity, SyncStatus, SyncType } from './types';
import { mapBrokerType } from './mapper';
import { DatePrecision, OrderSide, OrderType, OrderStatus, TimeInForce } from '@prisma/client';
import { createHash } from 'crypto';
import { AccountUniversalActivity } from 'snaptrade-typescript-sdk';

export interface ActivityProcessorOptions {
  dateFrom?: Date;
  dateTo?: Date;
  onProgress?: (progress: number, message: string) => void;
}

export interface ProcessResult {
  activitiesFound: number;
  ordersCreated: number;
  duplicatesSkipped: number;
  errors: string[];
  success: boolean;
}

/**
 * Convert AccountUniversalActivity to SnapTradeActivity format
 */
function adaptAccountActivity(activity: AccountUniversalActivity, accountInfo: { id: string; name: string; number?: string }): SnapTradeActivity {
  return {
    id: activity.id || '',
    account: {
      id: accountInfo.id,
      number: accountInfo.number || '',
      name: accountInfo.name,
    },
    symbol: {
      id: activity.symbol?.id || '',
      symbol: activity.symbol?.symbol || '',
      description: activity.symbol?.description || '',
      currency: {
        id: activity.symbol?.currency?.id || '',
        code: activity.symbol?.currency?.code || '',
        name: activity.symbol?.currency?.name || '',
      },
      exchange: {
        id: activity.symbol?.exchange?.id || '',
        code: activity.symbol?.exchange?.code || '',
        name: activity.symbol?.exchange?.name || '',
      },
    },
    trade_date: activity.trade_date || '',
    settlement_date: activity.settlement_date || '',
    type: activity.type || '',
    description: activity.description || '',
    quantity: activity.units || 0,
    price: activity.price || 0,
    currency: {
      id: activity.currency?.id || '',
      code: activity.currency?.code || '',
      name: activity.currency?.name || '',
    },
    institution: activity.institution || '',
    option_type: activity.option_type,
    option_strike_price: activity.option_symbol?.strike_price,
    option_expiration_date: activity.option_symbol?.expiration_date,
  } as SnapTradeActivity;
}

/**
 * SnapTrade Activity Processor with Time Adjustment
 */
export class SnapTradeActivityProcessor {
  private readonly BATCH_SIZE = 500;
  private dateCounters = new Map<string, number>();

  /**
   * Adjust execution time for brokers with daily precision
   */
  private adjustTimeForBroker(activity: SnapTradeActivity, broker: string): Date {
    const baseDate = new Date(activity.trade_date);
    
    // Brokers that only provide daily precision (no intraday timestamps)
    const dailyPrecisionBrokers = ['Schwab', 'Charles Schwab', 'TD Ameritrade'];
    
    if (dailyPrecisionBrokers.some(b => broker.includes(b))) {
      // Create unique time within the trading day to maintain order
      const dateKey = `${broker}-${baseDate.toISOString().split('T')[0]}`;
      const counter = this.dateCounters.get(dateKey) || 0;
      this.dateCounters.set(dateKey, counter + 1);
      
      // Spread activities throughout trading hours (9:30 AM - 4:00 PM EST)
      // Start at 9:30 AM and increment by seconds
      const tradingStartHour = 9;
      const tradingStartMinute = 30;
      const totalTradingSeconds = 6.5 * 60 * 60; // 6.5 hours in seconds
      
      // Calculate time offset (max 1 second apart to maintain microsecond differences)
      const secondOffset = counter % totalTradingSeconds;
      
      baseDate.setHours(tradingStartHour, tradingStartMinute, secondOffset, counter % 1000);
      return baseDate;
    }
    
    // Return original timestamp for millisecond precision brokers
    return baseDate;
  }

  /**
   * Create activity hash for deduplication
   */
  private createActivityHash(activity: SnapTradeActivity): string {
    const hashInput = [
      activity.id,
      activity.symbol?.symbol,
      activity.type,
      activity.quantity,
      activity.price,
      activity.trade_date,
      activity.institution
    ].join('|');
    
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Determine date precision based on broker
   */
  private getDatePrecision(broker: string): DatePrecision {
    const dailyPrecisionBrokers = ['Schwab', 'Charles Schwab', 'TD Ameritrade'];
    return dailyPrecisionBrokers.some(b => broker.includes(b)) ? DatePrecision.DAILY : DatePrecision.MILLISECOND;
  }

  /**
   * Convert SnapTrade activity to Order format
   */
  private mapActivityToOrder(
    activity: SnapTradeActivity,
    userId: string,
    connectionId: string,
    importSequence: number
  ) {
    const broker = activity.institution || 'Unknown';
    const adjustedTime = this.adjustTimeForBroker(activity, broker);
    const datePrecision = this.getDatePrecision(broker);
    const activityHash = this.createActivityHash(activity);

    // Determine order side
    const isBuy = activity.type === 'BUY' || (activity.quantity && activity.quantity > 0);
    const side = isBuy ? OrderSide.BUY : OrderSide.SELL;

    return {
      userId,
      orderId: `ST-${broker.replace(/\s+/g, '')}-${activity.id}`,
      symbol: activity.symbol?.symbol || '',
      orderType: OrderType.MARKET, // SnapTrade activities are typically market orders
      side,
      timeInForce: TimeInForce.DAY,
      orderQuantity: Math.abs(activity.quantity || 0),
      limitPrice: activity.price || 0,
      orderStatus: OrderStatus.FILLED,
      orderPlacedTime: adjustedTime,
      orderExecutedTime: adjustedTime,
      accountId: activity.account?.id,
      brokerType: mapBrokerType(broker),
      
      // SnapTrade-specific fields
      snapTradeActivityId: activity.id,
      datePrecision,
      importSequence,
      activityHash,
      brokerMetadata: {
        originalTradeDate: activity.trade_date,
        settlementDate: activity.settlement_date,
        institution: activity.institution,
        currency: activity.currency?.code,
        fee: (activity as any).fee,
        description: activity.description,
        type: activity.type,
        exchange: activity.symbol?.exchange?.code,
        optionType: activity.option_type,
        optionStrikePrice: activity.option_strike_price,
        optionExpirationDate: activity.option_expiration_date
      }
    };
  }

  /**
   * Check for duplicate activities by hash
   */
  private async filterDuplicates(orders: any[], userId: string): Promise<any[]> {
    if (orders.length === 0) return orders;

    const hashes = orders.map(o => o.activityHash).filter(Boolean);
    if (hashes.length === 0) return orders;

    const existing = await prisma.order.findMany({
      where: {
        userId,
        activityHash: { in: hashes }
      },
      select: { activityHash: true }
    });

    const existingHashes = new Set(existing.map(o => o.activityHash));
    return orders.filter(o => !existingHashes.has(o.activityHash));
  }

  /**
   * Process activities for a single connection
   */
  async processActivities(
    connectionId: string,
    userId: string,
    options: ActivityProcessorOptions = {}
  ): Promise<ProcessResult> {
    const { dateFrom, dateTo, onProgress } = options;
    const errors: string[] = [];
    let activitiesFound = 0;
    let ordersCreated = 0;
    let duplicatesSkipped = 0;

    try {
      // Get the user's SnapTrade credentials
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          snapTradeUserId: true,
          snapTradeUserSecret: true,
        },
      });
      
      if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
        throw new Error('SnapTrade credentials not found for user');
      }

      onProgress?.(10, 'Connecting to SnapTrade API');
      
      await RateLimitHelper.checkRateLimit();
      const client = getSnapTradeClient();
      const decryptedSecret = user.snapTradeUserSecret;

      // Get accounts for this connection
      const accountsResponse = await client.accountInformation.listUserAccounts({
        userId: user.snapTradeUserId,
        userSecret: decryptedSecret,
      });

      const accounts = accountsResponse.data || [];
      onProgress?.(20, `Found ${accounts.length} accounts`);

      // Calculate date range
      const startDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = dateTo || new Date();

      let processedAccounts = 0;
      const allOrders: any[] = [];

      // Process each account
      for (const account of accounts) {
        try {
          onProgress?.(
            20 + (processedAccounts / accounts.length) * 60,
            `Processing account ${account.name || account.id}`
          );

          await RateLimitHelper.checkRateLimit();
          
          // Get activities for this account
          const activitiesResponse = await client.accountInformation.getAccountActivities({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
            accountId: account.id,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          });

          const activitiesData = activitiesResponse.data;
          const rawActivities: AccountUniversalActivity[] = (activitiesData && 'data' in activitiesData) 
            ? (activitiesData.data || []) 
            : [];

          // Convert AccountUniversalActivity to SnapTradeActivity format
          const activities: SnapTradeActivity[] = rawActivities.map(activity => 
            adaptAccountActivity(activity, { id: account.id, name: account.name || '', number: account.number })
          );

          // Filter for trade activities only (BUY/SELL)
          const tradeActivities = activities.filter(activity => 
            ['BUY', 'SELL'].includes(activity.type?.toUpperCase() || '')
          );

          activitiesFound += tradeActivities.length;

          // Convert activities to orders with sequence numbers
          const orders = tradeActivities.map((activity, index) =>
            this.mapActivityToOrder(activity, userId, connectionId, index)
          );

          allOrders.push(...orders);

        } catch (error) {
          const errorMsg = `Failed to process account ${account.id}: ${handleSnapTradeError(error)}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
        }

        processedAccounts++;
      }

      onProgress?.(80, 'Checking for duplicates');

      // Filter out duplicates
      const originalCount = allOrders.length;
      const uniqueOrders = await this.filterDuplicates(allOrders, userId);
      duplicatesSkipped = originalCount - uniqueOrders.length;

      onProgress?.(90, 'Saving orders to database');

      // Batch insert orders
      if (uniqueOrders.length > 0) {
        for (let i = 0; i < uniqueOrders.length; i += this.BATCH_SIZE) {
          const batch = uniqueOrders.slice(i, i + this.BATCH_SIZE);
          
          await prisma.order.createMany({
            data: batch,
            skipDuplicates: true
          });

          ordersCreated += batch.length;
        }
      }

      onProgress?.(100, 'Import completed');

      return {
        activitiesFound,
        ordersCreated,
        duplicatesSkipped,
        errors,
        success: errors.length === 0
      };

    } catch (error) {
      const errorMsg = handleSnapTradeError(error);
      errors.push(errorMsg);
      
      return {
        activitiesFound,
        ordersCreated,
        duplicatesSkipped,
        errors,
        success: false
      };
    } finally {
      // Reset date counters for next run
      this.dateCounters.clear();
    }
  }

  /**
   * Test method that processes provided activities without saving to database
   * Mimics processActivities but uses pre-fetched activities and returns orders for inspection
   */
  async testProcessActivities(
    rawActivities: AccountUniversalActivity[],
    accountInfo: { id: string; name: string; number?: string },
    userId: string,
    connectionId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    activitiesFound: number;
    ordersWouldBeCreated: number;
    duplicatesSkipped: number;
    errors: string[];
    success: boolean;
    ordersData: any[];
  }> {
    const errors: string[] = [];
    let activitiesFound = 0;
    let ordersWouldBeCreated = 0;
    let duplicatesSkipped = 0;

    try {
      onProgress?.(10, 'Converting activities to internal format');

      // Convert AccountUniversalActivity to SnapTradeActivity format
      const activities: SnapTradeActivity[] = rawActivities.map(activity => 
        adaptAccountActivity(activity, accountInfo)
      );

      console.log(`Converted ${activities.length} raw activities to internal format`);

      onProgress?.(30, 'Filtering for trade activities (BUY/SELL)');

      // Filter for trade activities only (BUY/SELL) - same logic as processActivities
      const tradeActivities = activities.filter(activity => 
        ['BUY', 'SELL'].includes(activity.type?.toUpperCase() || '')
      );

      activitiesFound = tradeActivities.length;
      console.log(`Found ${activitiesFound} trade activities (BUY/SELL) out of ${activities.length} total activities`);

      if (tradeActivities.length === 0) {
        console.log('No BUY/SELL activities found to process');
        return {
          activitiesFound,
          ordersWouldBeCreated: 0,
          duplicatesSkipped: 0,
          errors,
          success: true,
          ordersData: []
        };
      }

      onProgress?.(50, 'Converting activities to order format');

      // Convert activities to orders with sequence numbers - same logic as processActivities
      const orders = tradeActivities.map((activity, index) =>
        this.mapActivityToOrder(activity, userId, connectionId, index)
      );

      console.log(`Mapped ${orders.length} activities to order format`);
      console.log('Sample order structure:', JSON.stringify(orders[0], null, 2));

      onProgress?.(70, 'Checking for potential duplicates');

      // Filter out duplicates - same logic as processActivities
      const originalCount = orders.length;
      const uniqueOrders = await this.filterDuplicates(orders, userId);
      duplicatesSkipped = originalCount - uniqueOrders.length;

      console.log(`Duplicate check: ${originalCount} orders -> ${uniqueOrders.length} unique orders (${duplicatesSkipped} duplicates)`);

      ordersWouldBeCreated = uniqueOrders.length;

      onProgress?.(90, 'Logging order details');

      // Log detailed information about each order that would be created
      console.log('\n=== ORDERS THAT WOULD BE CREATED ===');
      uniqueOrders.forEach((order, index) => {
        console.log(`\nOrder ${index + 1}:`, {
          orderId: order.orderId,
          symbol: order.symbol,
          side: order.side,
          orderType: order.orderType,
          orderQuantity: order.orderQuantity,
          limitPrice: order.limitPrice,
          orderExecutedTime: order.orderExecutedTime,
          accountId: order.accountId,
          brokerType: order.brokerType,
          snapTradeActivityId: order.snapTradeActivityId,
          activityHash: order.activityHash,
          brokerMetadata: {
            originalTradeDate: order.brokerMetadata?.originalTradeDate,
            institution: order.brokerMetadata?.institution,
            type: order.brokerMetadata?.type,
            description: order.brokerMetadata?.description,
            currency: order.brokerMetadata?.currency,
            exchange: order.brokerMetadata?.exchange
          }
        });
      });
      console.log('=== END ORDERS ===\n');

      onProgress?.(100, 'Test processing complete');

      return {
        activitiesFound,
        ordersWouldBeCreated,
        duplicatesSkipped,
        errors,
        success: errors.length === 0,
        ordersData: uniqueOrders
      };

    } catch (error) {
      const errorMsg = handleSnapTradeError(error);
      errors.push(errorMsg);
      console.error('Error in test processing:', errorMsg, error);
      
      return {
        activitiesFound,
        ordersWouldBeCreated,
        duplicatesSkipped,
        errors,
        success: false,
        ordersData: []
      };
    }
  }

  /**
   * Get activity count estimate for date range (for UI planning)
   */
  async estimateActivityCount(
    connectionId: string,
    userId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          snapTradeUserId: true,
          snapTradeUserSecret: true,
        },
      });
      
      if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) return 0;

      await RateLimitHelper.checkRateLimit();
      const client = getSnapTradeClient();
      const decryptedSecret = user.snapTradeUserSecret;

      const accountsResponse = await client.accountInformation.listUserAccounts({
        userId: user.snapTradeUserId,
        userSecret: decryptedSecret,
      });

      let totalEstimate = 0;
      const accounts = accountsResponse.data || [];

      // Sample first account to estimate
      if (accounts.length > 0) {
        const sampleAccount = accounts[0];
        
        await RateLimitHelper.checkRateLimit();
        const activitiesResponse = await client.accountInformation.getAccountActivities({
          userId: user.snapTradeUserId,
          userSecret: decryptedSecret,
          accountId: sampleAccount.id,
          startDate: dateFrom.toISOString().split('T')[0],
          endDate: dateTo.toISOString().split('T')[0],
        });

        const activitiesData = activitiesResponse.data;
        const activities: SnapTradeActivity[] = (activitiesData && 'activities' in activitiesData) 
          ? (activitiesData.activities || []) 
          : [];

        const tradeActivities = activities.filter(activity => 
          ['BUY', 'SELL'].includes(activity.type?.toUpperCase() || '')
        );

        // Estimate for all accounts (assuming similar activity levels)
        totalEstimate = tradeActivities.length * accounts.length;
      }

      return totalEstimate;

    } catch (error) {
      console.error('Failed to estimate activity count:', error);
      return 0;
    }
  }
}