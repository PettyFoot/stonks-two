import { prisma } from '@/lib/prisma';
import { getSnapTradeClient } from '@/lib/snaptrade/client';
import { Redis } from '@upstash/redis';

/**
 * CRITICAL: Emergency Stop System for Single Position Trading Bot
 *
 * This class must NEVER be modified once working and tested.
 * All changes require extensive testing and approval.
 *
 * Simplified for single position trading - only ever one position to close.
 */
export class EmergencyStopSystem {
  private static instance: EmergencyStopSystem;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }

  static getInstance(): EmergencyStopSystem {
    if (!EmergencyStopSystem.instance) {
      EmergencyStopSystem.instance = new EmergencyStopSystem();
    }
    return EmergencyStopSystem.instance;
  }

  /**
   * EMERGENCY STOP - Cancels all orders and closes the single position
   * Simplified for single position trading bot
   *
   * @param triggeredBy User ID who triggered the stop
   * @param reason Reason for emergency stop
   */
  async executeEmergencyStop(triggeredBy: string, reason: string): Promise<{
    success: boolean;
    positionClosed: number;
    ordersCancelled: number;
    errors: string[];
  }> {
    // Prevent concurrent emergency stops
    const lockKey = 'emergency_stop_lock';
    const lockAcquired = await this.redis.set(lockKey, '1', {
      nx: true,
      ex: 60 // 60 second lock
    });

    if (!lockAcquired) {
      return {
        success: false,
        positionClosed: 0,
        ordersCancelled: 0,
        errors: ['Emergency stop already in progress']
      };
    }

    const errors: string[] = [];
    let positionClosed = 0;
    let ordersCancelled = 0;

    try {
      console.log(`[EMERGENCY_STOP] Starting emergency stop for user ${triggeredBy}`);

      // 1. Set global kill switch in Redis
      await this.redis.set('bot_kill_switch', 'true');
      console.log('[EMERGENCY_STOP] Kill switch activated');

      // 2. Deactivate all trading states
      await prisma.tradingState.updateMany({
        data: { isActive: false }
      });
      console.log('[EMERGENCY_STOP] All trading deactivated');

      // 3. Get all pending orders (should be minimal in single position system)
      const pendingOrders = await prisma.botOrder.findMany({
        where: {
          status: {
            in: ['PENDING', 'PLACED']
          }
        }
      });

      console.log(`[EMERGENCY_STOP] Found ${pendingOrders.length} pending orders to cancel`);

      // 4. Cancel each pending order via SnapTrade API
      const snapTradeClient = getSnapTradeClient();

      for (const order of pendingOrders) {
        try {
          if (order.brokerOrderId) {
            console.log(`[EMERGENCY_STOP] Cancelling order ${order.brokerOrderId}`);

            await snapTradeClient.trading.cancelUserAccountOrder({
              userId: order.userId,
              userSecret: order.userSecret || process.env.SNAPTRADE_USER_SECRET!,
              accountId: order.accountId,
              brokerage_order_id: order.brokerOrderId
            });

            // Update database
            await prisma.botOrder.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: 'EMERGENCY_STOP'
              }
            });

            ordersCancelled++;
            console.log(`[EMERGENCY_STOP] Successfully cancelled order ${order.brokerOrderId}`);
          }
        } catch (error) {
          const errorMsg = `Failed to cancel order ${order.id}: ${error}`;
          errors.push(errorMsg);
          console.error(`[EMERGENCY_STOP] ${errorMsg}`);
        }
      }

      // 5. Get the single open position (if any)
      const openPosition = await prisma.botPosition.findFirst({
        where: {
          status: 'OPEN'
        }
      });

      if (openPosition) {
        console.log(`[EMERGENCY_STOP] Found open position for ${openPosition.symbol}, closing at market`);

        try {
          // Close position with market order and IOC (Immediate or Cancel) for fastest execution
          const closeOrder = await snapTradeClient.trading.placeForceOrder({
            userId: openPosition.userId,
            userSecret: process.env.SNAPTRADE_USER_SECRET!,
            account_id: openPosition.accountId,
            action: openPosition.side === 'LONG' ? 'SELL' : 'BUY',
            order_type: 'Market',
            time_in_force: 'IOC', // Immediate or cancel for emergency
            universal_symbol_id: openPosition.universalSymbolId,
            units: Math.abs(openPosition.quantity)
          });

          // Update position status
          await prisma.botPosition.update({
            where: { id: openPosition.id },
            data: {
              status: 'EMERGENCY_CLOSED',
              closedAt: new Date()
            }
          });

          // Update trading state
          await prisma.tradingState.updateMany({
            where: { userId: openPosition.userId },
            data: { hasOpenPosition: false }
          });

          positionClosed = 1;
          console.log(`[EMERGENCY_STOP] Successfully closed position ${openPosition.symbol}`);

        } catch (error) {
          const errorMsg = `Failed to close position ${openPosition.symbol}: ${error}`;
          errors.push(errorMsg);
          console.error(`[EMERGENCY_STOP] ${errorMsg}`);
        }
      } else {
        console.log('[EMERGENCY_STOP] No open position found');
      }

      // 6. Log emergency stop event
      await prisma.emergencyStop.create({
        data: {
          triggeredBy,
          reason,
          positionsClosed: positionClosed,
          ordersCancelled,
          metadata: {
            errors,
            timestamp: new Date().toISOString()
          }
        }
      });

      // 7. Send emergency alerts
      await this.sendEmergencyAlerts(triggeredBy, reason, positionClosed, ordersCancelled);

      const success = errors.length === 0;
      console.log(`[EMERGENCY_STOP] Completed - Success: ${success}, Position closed: ${positionClosed}, Orders cancelled: ${ordersCancelled}`);

      return {
        success,
        positionClosed,
        ordersCancelled,
        errors
      };

    } catch (error) {
      const errorMsg = `Emergency stop failed: ${error}`;
      errors.push(errorMsg);
      console.error(`[EMERGENCY_STOP] ${errorMsg}`);

      return {
        success: false,
        positionClosed,
        ordersCancelled,
        errors
      };
    } finally {
      // Always release lock
      await this.redis.del(lockKey);
      console.log('[EMERGENCY_STOP] Lock released');
    }
  }

  /**
   * Check if emergency stop is currently active
   */
  async isEmergencyActive(): Promise<boolean> {
    const killSwitch = await this.redis.get('bot_kill_switch');
    return killSwitch === 'true';
  }

  /**
   * Reset emergency stop (for testing or manual reset)
   * Should be used with extreme caution
   */
  async resetEmergencyStop(): Promise<void> {
    await this.redis.del('bot_kill_switch');
    console.log('[EMERGENCY_STOP] Kill switch reset');
  }

  /**
   * Send emergency alerts via various channels
   */
  private async sendEmergencyAlerts(
    triggeredBy: string,
    reason: string,
    positionClosed: number,
    ordersCancelled: number
  ): Promise<void> {
    try {
      // Log to console (will be captured by logging service)
      console.error(`🚨 EMERGENCY STOP TRIGGERED 🚨`);
      console.error(`Triggered by: ${triggeredBy}`);
      console.error(`Reason: ${reason}`);
      console.error(`Position closed: ${positionClosed}`);
      console.error(`Orders cancelled: ${ordersCancelled}`);
      console.error(`Time: ${new Date().toISOString()}`);

      // TODO: Add email notifications using existing nodemailer setup
      // TODO: Add Discord webhook if available
      // TODO: Add SMS alerts for critical situations

    } catch (error) {
      console.error(`[EMERGENCY_STOP] Failed to send alerts: ${error}`);
    }
  }

  /**
   * Get recent emergency stop history
   */
  async getEmergencyHistory(limit: number = 10): Promise<any[]> {
    return await prisma.emergencyStop.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: limit
    });
  }
}

// Export convenience function for quick access
export async function executeEmergencyStop(triggeredBy: string, reason: string) {
  const emergencyStop = EmergencyStopSystem.getInstance();
  return await emergencyStop.executeEmergencyStop(triggeredBy, reason);
}

// Export function to check emergency status
export async function isEmergencyActive(): Promise<boolean> {
  const emergencyStop = EmergencyStopSystem.getInstance();
  return await emergencyStop.isEmergencyActive();
}