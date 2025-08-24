import { prisma } from '@/lib/prisma';
import { Order } from '@prisma/client';

export class OrdersRepository {
  /**
   * Get unprocessed orders for a user
   * Orders are considered unprocessed if:
   * - They are executed (orderExecutedTime is not null)
   * - They are not cancelled (orderCancelledTime is null)
   * - They have not been linked to a trade (tradeId is null)
   */
  async getUnprocessedOrders(userId: string): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        userId,
        orderExecutedTime: { not: null },
        orderCancelledTime: null,
        tradeId: null,
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
}

export const ordersRepo = new OrdersRepository();