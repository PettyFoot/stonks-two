import { prisma } from '@/lib/prisma';
import { Order } from '@prisma/client';

export class OrdersRepository {
  /**
   * Get unprocessed orders for a user
   * Orders are considered unprocessed if:
   * - They are executed (orderExecutedTime is not null)
   * - They are not cancelled (orderCancelledTime is null)
   * - They have not been linked to a trade (tradeId is null)
   * - They have not been used/split (usedInTrade is false)
   */
  async getUnprocessedOrders(userId: string): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        userId,
        orderExecutedTime: { not: null },
        orderCancelledTime: null,
        tradeId: null,
        usedInTrade: false,
      },
      orderBy: {
        orderExecutedTime: 'asc',
      },
    });
  }

  /**
   * Update multiple orders with the same tradeId
   */
  async updateOrdersWithTradeId(orderIds: string[], tradeId: string): Promise<void> {
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        tradeId,
      },
    });
  }

  /**
   * Get orders by their order IDs
   */
  async getOrdersByIds(orderIds: string[]): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
    });
  }

  /**
   * Get orders linked to a specific trade
   */
  async getOrdersByTradeId(tradeId: string): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        tradeId,
      },
      orderBy: {
        orderExecutedTime: 'asc',
      },
    });
  }

  /**
   * Check if orders are shared across multiple trades
   * Returns a map of orderId -> array of trade IDs that reference it
   */
  async getSharedOrderInfo(orderIds: string[]): Promise<Map<string, string[]>> {
    const sharedOrderMap = new Map<string, string[]>();

    // Get all trades that reference these order IDs
    const trades = await prisma.trade.findMany({
      where: {
        ordersInTrade: {
          hasSome: orderIds,
        },
      },
      select: {
        id: true,
        ordersInTrade: true,
      },
    });

    // Build a map of which trades reference each order
    for (const orderId of orderIds) {
      const tradesUsingOrder = trades
        .filter(trade => trade.ordersInTrade.includes(orderId))
        .map(trade => trade.id);

      if (tradesUsingOrder.length > 0) {
        sharedOrderMap.set(orderId, tradesUsingOrder);
      }
    }

    return sharedOrderMap;
  }

  /**
   * Delete orders by their IDs
   */
  async deleteOrders(orderIds: string[]): Promise<number> {
    const result = await prisma.order.deleteMany({
      where: {
        id: { in: orderIds },
      },
    });

    return result.count;
  }

  /**
   * Split an order into two separate orders
   * Used when an order participates in closing one trade and opening another
   *
   * @param orderId - The ID of the order to split
   * @param quantity1 - Quantity for the first split order
   * @param quantity2 - Quantity for the second split order
   * @returns Array of two new order IDs [order1Id, order2Id]
   */
  async splitOrder(
    orderId: string,
    quantity1: number,
    quantity2: number
  ): Promise<[string, string]> {
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!originalOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Validate quantities
    if (quantity1 + quantity2 !== originalOrder.orderQuantity) {
      throw new Error(
        `Split quantities (${quantity1} + ${quantity2}) must equal original quantity (${originalOrder.orderQuantity})`
      );
    }

    if (quantity1 <= 0 || quantity2 <= 0) {
      throw new Error('Split quantities must be greater than 0');
    }

    // Create two new orders with the split quantities
    const [order1, order2] = await prisma.$transaction(async (tx) => {
      // Create first split order
      const splitOrder1 = await tx.order.create({
        data: {
          userId: originalOrder.userId,
          orderId: `${originalOrder.orderId}-split-1`,
          splitFromOrderId: originalOrder.id, // Link to original order that was split
          symbol: originalOrder.symbol,
          orderType: originalOrder.orderType,
          side: originalOrder.side,
          timeInForce: originalOrder.timeInForce,
          orderQuantity: quantity1,
          limitPrice: originalOrder.limitPrice,
          stopPrice: originalOrder.stopPrice,
          orderStatus: originalOrder.orderStatus,
          orderPlacedTime: originalOrder.orderPlacedTime,
          orderExecutedTime: originalOrder.orderExecutedTime,
          orderUpdatedTime: originalOrder.orderUpdatedTime,
          orderCancelledTime: originalOrder.orderCancelledTime,
          accountId: originalOrder.accountId,
          orderAccount: originalOrder.orderAccount,
          orderRoute: originalOrder.orderRoute,
          brokerType: originalOrder.brokerType,
          commission: originalOrder.commission,
          fees: originalOrder.fees,
          tags: originalOrder.tags,
          usedInTrade: false,
          importBatchId: originalOrder.importBatchId,
          activityHash: originalOrder.activityHash,
          brokerMetadata: originalOrder.brokerMetadata ?? undefined,
          datePrecision: originalOrder.datePrecision,
          importSequence: originalOrder.importSequence,
        },
      });

      // Create second split order
      const splitOrder2 = await tx.order.create({
        data: {
          userId: originalOrder.userId,
          orderId: `${originalOrder.orderId}-split-2`,
          splitFromOrderId: originalOrder.id, // Link to original order that was split
          symbol: originalOrder.symbol,
          orderType: originalOrder.orderType,
          side: originalOrder.side,
          timeInForce: originalOrder.timeInForce,
          orderQuantity: quantity2,
          limitPrice: originalOrder.limitPrice,
          stopPrice: originalOrder.stopPrice,
          orderStatus: originalOrder.orderStatus,
          orderPlacedTime: originalOrder.orderPlacedTime,
          orderExecutedTime: originalOrder.orderExecutedTime,
          orderUpdatedTime: originalOrder.orderUpdatedTime,
          orderCancelledTime: originalOrder.orderCancelledTime,
          accountId: originalOrder.accountId,
          orderAccount: originalOrder.orderAccount,
          orderRoute: originalOrder.orderRoute,
          brokerType: originalOrder.brokerType,
          commission: originalOrder.commission,
          fees: originalOrder.fees,
          tags: originalOrder.tags,
          usedInTrade: false,
          importBatchId: originalOrder.importBatchId,
          activityHash: originalOrder.activityHash,
          brokerMetadata: originalOrder.brokerMetadata ?? undefined,
          datePrecision: originalOrder.datePrecision,
          importSequence: originalOrder.importSequence,
        },
      });

      // Archive the original parent order to SplitOrdersParentOrders table
      await tx.splitOrdersParentOrders.create({
        data: {
          id: originalOrder.id,
          userId: originalOrder.userId,
          orderId: originalOrder.orderId,
          parentOrderId: originalOrder.parentOrderId,
          splitFromOrderId: originalOrder.splitFromOrderId,
          symbol: originalOrder.symbol,
          orderType: originalOrder.orderType,
          side: originalOrder.side,
          timeInForce: originalOrder.timeInForce,
          orderQuantity: originalOrder.orderQuantity,
          limitPrice: originalOrder.limitPrice,
          stopPrice: originalOrder.stopPrice,
          orderStatus: originalOrder.orderStatus,
          orderPlacedTime: originalOrder.orderPlacedTime,
          orderExecutedTime: originalOrder.orderExecutedTime,
          orderUpdatedTime: originalOrder.orderUpdatedTime,
          orderCancelledTime: originalOrder.orderCancelledTime,
          accountId: originalOrder.accountId,
          orderAccount: originalOrder.orderAccount,
          orderRoute: originalOrder.orderRoute,
          brokerType: originalOrder.brokerType,
          commission: originalOrder.commission,
          fees: originalOrder.fees,
          tags: originalOrder.tags,
          usedInTrade: true,
          tradeId: originalOrder.tradeId,
          importBatchId: originalOrder.importBatchId,
          activityHash: originalOrder.activityHash,
          brokerMetadata: originalOrder.brokerMetadata ?? undefined,
          datePrecision: originalOrder.datePrecision,
          importSequence: originalOrder.importSequence,
          snapTradeActivityId: originalOrder.snapTradeActivityId,
        },
      });

      // Delete the original order from the orders table
      await tx.order.delete({
        where: { id: orderId },
      });

      return [splitOrder1, splitOrder2];
    });

    console.log(`[ORDERS REPO] Split order ${orderId} into:`, {
      originalQuantity: originalOrder.orderQuantity,
      split1: { id: order1.id, quantity: quantity1 },
      split2: { id: order2.id, quantity: quantity2 },
    });

    return [order1.id, order2.id];
  }
}

export const ordersRepo = new OrdersRepository();