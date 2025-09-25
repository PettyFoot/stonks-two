import { prisma } from '@/lib/prisma';
import { getSnapTradeClient } from '@/lib/snaptrade/client';
import { isEmergencyActive } from './emergencyStop';

/**
 * Position Manager for Single Position Trading Bot
 *
 * Enforces the critical rule: ONLY ONE POSITION AT A TIME
 * Uses SnapTrade API following their documented best practices
 */

export interface OpenPositionParams {
  symbol: string;
  symbolId: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy?: string;
}

export interface PositionStatus {
  hasPosition: boolean;
  position?: any;
  canTrade: boolean;
  reason?: string;
}

export class PositionManager {
  private readonly userId: string;
  private readonly accountId: string;
  private readonly userSecret: string;

  constructor(userId: string, accountId: string, userSecret: string) {
    this.userId = userId;
    this.accountId = accountId;
    this.userSecret = userSecret;
  }

  /**
   * Check if we can open a new position
   * CRITICAL: Enforces single position rule
   */
  async canOpenPosition(): Promise<PositionStatus> {
    try {
      // Check if emergency stop is active
      if (await isEmergencyActive()) {
        return {
          hasPosition: false,
          canTrade: false,
          reason: 'Emergency stop is active'
        };
      }

      // Get trading state
      const tradingState = await prisma.tradingState.findUnique({
        where: { userId: this.userId }
      });

      if (!tradingState?.isActive) {
        return {
          hasPosition: false,
          canTrade: false,
          reason: 'Trading bot is not active'
        };
      }

      if (tradingState.hasOpenPosition) {
        const position = await prisma.botPosition.findFirst({
          where: {
            userId: this.userId,
            status: 'OPEN'
          }
        });

        return {
          hasPosition: true,
          position,
          canTrade: false,
          reason: 'Already have an open position'
        };
      }

      // Check for any pending orders
      const pendingOrders = await prisma.botOrder.count({
        where: {
          userId: this.userId,
          status: { in: ['PENDING', 'PLACED'] }
        }
      });

      if (pendingOrders > 0) {
        return {
          hasPosition: false,
          canTrade: false,
          reason: 'Have pending orders'
        };
      }

      return {
        hasPosition: false,
        canTrade: true
      };

    } catch (error) {
      console.error('[POSITION_MANAGER] Error checking position status:', error);
      return {
        hasPosition: false,
        canTrade: false,
        reason: 'Error checking position status'
      };
    }
  }

  /**
   * Open a new position using SnapTrade's recommended two-step process
   * 1. Check order impact
   * 2. Place the validated order
   */
  async openPosition(params: OpenPositionParams): Promise<{
    success: boolean;
    order?: any;
    position?: any;
    error?: string;
  }> {
    const snapTradeClient = getSnapTradeClient();

    try {
      console.log(`[POSITION_MANAGER] Attempting to open ${params.side} position for ${params.symbol}`);

      // CRITICAL: Check if we can open position
      const status = await this.canOpenPosition();
      if (!status.canTrade) {
        const error = `Cannot open position: ${status.reason}`;
        console.log(`[POSITION_MANAGER] ${error}`);
        return { success: false, error };
      }

      // Rate limiting check (SnapTrade: 1 trade per second per account)
      const lastTradeKey = `last_trade:${this.accountId}`;
      const lastTrade = await prisma.$queryRaw`
        SELECT "placedAt" FROM "bot_orders"
        WHERE "accountId" = ${this.accountId}
        ORDER BY "placedAt" DESC
        LIMIT 1
      ` as any[];

      if (lastTrade.length > 0) {
        const timeSinceLastTrade = Date.now() - lastTrade[0].placedAt.getTime();
        if (timeSinceLastTrade < 1000) {
          return {
            success: false,
            error: 'Rate limit: Must wait 1 second between trades'
          };
        }
      }

      // Use database transaction to ensure atomicity
      return await prisma.$transaction(async (tx) => {
        // Double-check within transaction
        const state = await tx.tradingState.findUnique({
          where: { userId: this.userId }
        });

        if (state?.hasOpenPosition) {
          throw new Error('Position already exists');
        }

        console.log(`[POSITION_MANAGER] Step 1: Checking order impact`);

        // Step 1: Check order impact (SnapTrade recommended flow)
        const impact = await snapTradeClient.trading.getOrderImpact({
          userId: this.userId,
          userSecret: this.userSecret,
          account_id: this.accountId,
          action: params.side === 'LONG' ? 'BUY' : 'SELL',
          universal_symbol_id: params.symbolId,
          order_type: 'Market', // Using market orders for simplicity
          time_in_force: 'DAY',
          units: params.quantity
        });

        console.log(`[POSITION_MANAGER] Order impact check completed`);
        console.log(`[POSITION_MANAGER] - Estimated commission: $${impact.trade.estimated_commission}`);
        console.log(`[POSITION_MANAGER] - Trade ID: ${impact.trade.id}`);

        // Create order record with estimated fees
        const orderRecord = await tx.botOrder.create({
          data: {
            userId: this.userId,
            accountId: this.accountId,
            snapTradeTradeId: impact.trade.id,
            universalSymbolId: params.symbolId,
            symbol: params.symbol,
            action: params.side === 'LONG' ? 'BUY' : 'SELL',
            orderType: 'Market',
            timeInForce: 'DAY',
            quantity: params.quantity,
            estimatedCommission: impact.trade.estimated_commission || 0,
            estimatedFees: impact.trade.estimated_forex_fees || 0,
            userSecret: this.userSecret,
            status: 'PENDING'
          }
        });

        console.log(`[POSITION_MANAGER] Step 2: Placing validated order`);

        // Step 2: Place the validated order (within 5-minute expiry)
        const placedOrder = await snapTradeClient.trading.placeOrder({
          tradeId: impact.trade.id,
          userId: this.userId,
          userSecret: this.userSecret,
          wait_to_confirm: true // Wait for broker confirmation
        });

        console.log(`[POSITION_MANAGER] Order placed successfully`);
        console.log(`[POSITION_MANAGER] - Broker order ID: ${placedOrder.brokerage_order_id}`);

        // Update order record with broker details
        const updatedOrder = await tx.botOrder.update({
          where: { id: orderRecord.id },
          data: {
            brokerOrderId: placedOrder.brokerage_order_id,
            fillPrice: placedOrder.price || 0,
            status: placedOrder.state === 'FILLED' ? 'FILLED' : 'PLACED',
            filledAt: placedOrder.state === 'FILLED' ? new Date() : null,
            actualCommission: placedOrder.commission || placedOrder.estimated_commission,
            actualFees: placedOrder.fees || placedOrder.estimated_forex_fees
          }
        });

        // Create position record
        const position = await tx.botPosition.create({
          data: {
            userId: this.userId,
            accountId: this.accountId,
            universalSymbolId: params.symbolId,
            symbol: params.symbol,
            quantity: params.quantity,
            side: params.side,
            entryPrice: placedOrder.price || 0,
            entryOrderId: orderRecord.id,
            stopLoss: params.stopLoss,
            takeProfit: params.takeProfit,
            status: 'OPEN'
          }
        });

        // Update trading state
        await tx.tradingState.upsert({
          where: { userId: this.userId },
          create: {
            userId: this.userId,
            isActive: true,
            hasOpenPosition: true,
            currentStrategy: params.strategy,
            lastTradeAt: new Date(),
            totalTrades: 1
          },
          update: {
            hasOpenPosition: true,
            currentStrategy: params.strategy,
            lastTradeAt: new Date(),
            totalTrades: { increment: 1 }
          }
        });

        console.log(`[POSITION_MANAGER] ✅ Position opened successfully`);
        console.log(`[POSITION_MANAGER] - Symbol: ${params.symbol}`);
        console.log(`[POSITION_MANAGER] - Side: ${params.side}`);
        console.log(`[POSITION_MANAGER] - Quantity: ${params.quantity}`);
        console.log(`[POSITION_MANAGER] - Entry Price: $${placedOrder.price}`);

        return {
          success: true,
          order: updatedOrder,
          position
        };
      });

    } catch (error) {
      console.error('[POSITION_MANAGER] Failed to open position:', error);
      return {
        success: false,
        error: `Failed to open position: ${error}`
      };
    }
  }

  /**
   * Close the current position using market order
   */
  async closePosition(reason: string): Promise<{
    success: boolean;
    order?: any;
    error?: string;
  }> {
    const snapTradeClient = getSnapTradeClient();

    try {
      console.log(`[POSITION_MANAGER] Attempting to close position. Reason: ${reason}`);

      // Get the current open position
      const position = await prisma.botPosition.findFirst({
        where: {
          userId: this.userId,
          status: 'OPEN'
        }
      });

      if (!position) {
        console.log('[POSITION_MANAGER] No open position to close');
        return {
          success: false,
          error: 'No open position to close'
        };
      }

      console.log(`[POSITION_MANAGER] Closing ${position.side} position for ${position.symbol}`);

      // Place market order to close position using placeForceOrder for immediate execution
      const closeOrder = await snapTradeClient.trading.placeForceOrder({
        userId: this.userId,
        userSecret: this.userSecret,
        account_id: position.accountId,
        action: position.side === 'LONG' ? 'SELL' : 'BUY',
        order_type: 'Market',
        time_in_force: 'DAY',
        universal_symbol_id: position.universalSymbolId,
        units: position.quantity
      });

      console.log(`[POSITION_MANAGER] Close order placed: ${closeOrder.brokerage_order_id}`);

      // Update records in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create close order record
        const closeOrderRecord = await tx.botOrder.create({
          data: {
            userId: this.userId,
            accountId: this.accountId,
            brokerOrderId: closeOrder.brokerage_order_id,
            universalSymbolId: position.universalSymbolId,
            symbol: position.symbol,
            action: position.side === 'LONG' ? 'SELL' : 'BUY',
            orderType: 'Market',
            timeInForce: 'DAY',
            quantity: position.quantity,
            fillPrice: closeOrder.price || 0,
            status: closeOrder.state === 'FILLED' ? 'FILLED' : 'PLACED',
            filledAt: closeOrder.state === 'FILLED' ? new Date() : null,
            actualCommission: closeOrder.commission,
            actualFees: closeOrder.fees,
            userSecret: this.userSecret
          }
        });

        // Update position status
        await tx.botPosition.update({
          where: { id: position.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            currentPrice: closeOrder.price || position.entryPrice
          }
        });

        // Update trading state
        await tx.tradingState.update({
          where: { userId: this.userId },
          data: {
            hasOpenPosition: false,
            currentStrategy: null
          }
        });

        return closeOrderRecord;
      });

      console.log(`[POSITION_MANAGER] ✅ Position closed successfully`);

      return {
        success: true,
        order: result
      };

    } catch (error) {
      console.error('[POSITION_MANAGER] Failed to close position:', error);
      return {
        success: false,
        error: `Failed to close position: ${error}`
      };
    }
  }

  /**
   * Get current position status
   */
  async getCurrentPosition(): Promise<any | null> {
    try {
      const position = await prisma.botPosition.findFirst({
        where: {
          userId: this.userId,
          status: 'OPEN'
        }
      });

      return position;
    } catch (error) {
      console.error('[POSITION_MANAGER] Error getting current position:', error);
      return null;
    }
  }

  /**
   * Update current position price using SnapTrade quotes
   */
  async updatePositionPrice(): Promise<void> {
    try {
      const position = await this.getCurrentPosition();
      if (!position) return;

      const snapTradeClient = getSnapTradeClient();

      // Get current quote
      const quotes = await snapTradeClient.trading.getUserAccountQuotes({
        userId: this.userId,
        userSecret: this.userSecret,
        accountId: this.accountId,
        symbols: position.universalSymbolId,
        use_ticker: false
      });

      if (quotes.length > 0) {
        const quote = quotes[0];
        const currentPrice = quote.last_trade_price || quote.bid_price || position.entryPrice;

        // Calculate unrealized P&L
        const entryPrice = parseFloat(position.entryPrice.toString());
        const priceDiff = position.side === 'LONG'
          ? currentPrice - entryPrice
          : entryPrice - currentPrice;
        const unrealizedPnL = priceDiff * position.quantity;

        // Update position
        await prisma.botPosition.update({
          where: { id: position.id },
          data: {
            currentPrice,
            unrealizedPnL
          }
        });

        console.log(`[POSITION_MANAGER] Position price updated: ${position.symbol} @ $${currentPrice}`);
      }
    } catch (error) {
      console.error('[POSITION_MANAGER] Error updating position price:', error);
    }
  }

  /**
   * Check if stop loss or take profit should be triggered
   */
  async checkStopLossAndTakeProfit(): Promise<{
    shouldClose: boolean;
    reason?: string;
  }> {
    try {
      const position = await this.getCurrentPosition();
      if (!position || !position.currentPrice) {
        return { shouldClose: false };
      }

      const currentPrice = parseFloat(position.currentPrice.toString());
      const entryPrice = parseFloat(position.entryPrice.toString());

      // Check stop loss
      if (position.stopLoss) {
        const stopPrice = parseFloat(position.stopLoss.toString());

        if (position.side === 'LONG' && currentPrice <= stopPrice) {
          return {
            shouldClose: true,
            reason: `Stop loss triggered: ${currentPrice} <= ${stopPrice}`
          };
        }

        if (position.side === 'SHORT' && currentPrice >= stopPrice) {
          return {
            shouldClose: true,
            reason: `Stop loss triggered: ${currentPrice} >= ${stopPrice}`
          };
        }
      }

      // Check take profit
      if (position.takeProfit) {
        const takeProfitPrice = parseFloat(position.takeProfit.toString());

        if (position.side === 'LONG' && currentPrice >= takeProfitPrice) {
          return {
            shouldClose: true,
            reason: `Take profit triggered: ${currentPrice} >= ${takeProfitPrice}`
          };
        }

        if (position.side === 'SHORT' && currentPrice <= takeProfitPrice) {
          return {
            shouldClose: true,
            reason: `Take profit triggered: ${currentPrice} <= ${takeProfitPrice}`
          };
        }
      }

      return { shouldClose: false };

    } catch (error) {
      console.error('[POSITION_MANAGER] Error checking stop loss/take profit:', error);
      return { shouldClose: false };
    }
  }
}