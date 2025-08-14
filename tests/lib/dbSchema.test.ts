import { PrismaClient, TradeStatus, TradeSide, OrderSide, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Note: These tests require a test database connection
// In a real environment, you'd want to use a separate test database
const prisma = new PrismaClient();

describe('Database Schema Validation', () => {
  const testUserId = 'test-user-schema';
  let createdRecords: { trades: string[]; orders: string[]; users: string[] } = {
    trades: [],
    orders: [],
    users: [],
  };

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test-schema@example.com',
        auth0Id: 'auth0|schema-test',
        name: 'Schema Test User',
      },
    });
    createdRecords.users.push(testUser.id);
  });

  afterAll(async () => {
    // Clean up created records
    if (createdRecords.trades.length > 0) {
      await prisma.trade.deleteMany({
        where: { id: { in: createdRecords.trades } },
      });
    }
    if (createdRecords.orders.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: createdRecords.orders } },
      });
    }
    if (createdRecords.users.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdRecords.users } },
      });
    }
    await prisma.$disconnect();
  });

  describe('Trade model enhanced fields', () => {
    it('should create trade with new status field', async () => {
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'TEST',
          side: TradeSide.LONG,
          status: TradeStatus.OPEN,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 0,
        },
      });

      createdRecords.trades.push(trade.id);

      expect(trade.status).toBe(TradeStatus.OPEN);
      expect(trade.avgEntryPrice).toBeNull();
      expect(trade.avgExitPrice).toBeNull();
      expect(trade.openQuantity).toBeNull();
      expect(trade.closeQuantity).toBeNull();
    });

    it('should create trade with all enhanced fields populated', async () => {
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'TEST2',
          side: TradeSide.LONG,
          status: TradeStatus.CLOSED,
          avgEntryPrice: new Decimal('150.50'),
          avgExitPrice: new Decimal('155.75'),
          openQuantity: 100,
          closeQuantity: 100,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 525, // (155.75 - 150.50) * 100
        },
      });

      createdRecords.trades.push(trade.id);

      expect(trade.status).toBe(TradeStatus.CLOSED);
      expect(trade.avgEntryPrice?.toNumber()).toBe(150.50);
      expect(trade.avgExitPrice?.toNumber()).toBe(155.75);
      expect(trade.openQuantity).toBe(100);
      expect(trade.closeQuantity).toBe(100);
    });

    it('should validate TradeStatus enum values', async () => {
      // Test OPEN status
      const openTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'ENUM_TEST_OPEN',
          side: TradeSide.LONG,
          status: TradeStatus.OPEN,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 0,
        },
      });
      createdRecords.trades.push(openTrade.id);
      expect(openTrade.status).toBe('OPEN');

      // Test CLOSED status
      const closedTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'ENUM_TEST_CLOSED',
          side: TradeSide.LONG,
          status: TradeStatus.CLOSED,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 100,
        },
      });
      createdRecords.trades.push(closedTrade.id);
      expect(closedTrade.status).toBe('CLOSED');
    });
  });

  describe('Order model tradeId linking', () => {
    it('should create order with tradeId field', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUserId,
          orderId: 'test-order-123',
          symbol: 'TEST',
          orderType: 'MARKET',
          side: OrderSide.BUY,
          timeInForce: 'DAY',
          orderQuantity: 100,
          orderStatus: OrderStatus.FILLED,
          orderPlacedTime: new Date(),
          orderExecutedTime: new Date(),
          limitPrice: 150.00,
          tradeId: null, // Initially null
        },
      });

      createdRecords.orders.push(order.id);

      expect(order.tradeId).toBeNull();
      expect(order.orderId).toBe('test-order-123');
    });

    it('should link order to trade via tradeId', async () => {
      // Create a trade first
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'LINK_TEST',
          side: TradeSide.LONG,
          status: TradeStatus.CLOSED,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 100,
        },
      });
      createdRecords.trades.push(trade.id);

      // Create an order linked to the trade
      const order = await prisma.order.create({
        data: {
          userId: testUserId,
          orderId: 'linked-order-456',
          symbol: 'LINK_TEST',
          orderType: 'MARKET',
          side: OrderSide.BUY,
          timeInForce: 'DAY',
          orderQuantity: 100,
          orderStatus: OrderStatus.FILLED,
          orderPlacedTime: new Date(),
          orderExecutedTime: new Date(),
          limitPrice: 150.00,
          tradeId: trade.id,
        },
      });
      createdRecords.orders.push(order.id);

      expect(order.tradeId).toBe(trade.id);

      // Verify the relationship
      const orderWithTrade = await prisma.order.findUnique({
        where: { id: order.id },
        include: { trades: true },
      });

      expect(orderWithTrade?.tradeId).toBe(trade.id);
    });

    it('should update order tradeId', async () => {
      // Create order without tradeId
      const order = await prisma.order.create({
        data: {
          userId: testUserId,
          orderId: 'update-order-789',
          symbol: 'UPDATE_TEST',
          orderType: 'MARKET',
          side: OrderSide.BUY,
          timeInForce: 'DAY',
          orderQuantity: 100,
          orderStatus: OrderStatus.FILLED,
          orderPlacedTime: new Date(),
          orderExecutedTime: new Date(),
          limitPrice: 150.00,
          tradeId: null,
        },
      });
      createdRecords.orders.push(order.id);

      // Create trade
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'UPDATE_TEST',
          side: TradeSide.LONG,
          status: TradeStatus.OPEN,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 0,
        },
      });
      createdRecords.trades.push(trade.id);

      // Update order with tradeId
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { tradeId: trade.id },
      });

      expect(updatedOrder.tradeId).toBe(trade.id);
    });
  });

  describe('Database indexes', () => {
    it('should efficiently query trades by userId, symbol, status', async () => {
      // Create multiple trades for index testing
      const trade1 = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'INDEX_TEST',
          side: TradeSide.LONG,
          status: TradeStatus.OPEN,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 0,
        },
      });

      const trade2 = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'INDEX_TEST',
          side: TradeSide.LONG,
          status: TradeStatus.CLOSED,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 100,
        },
      });

      createdRecords.trades.push(trade1.id, trade2.id);

      // Query using the composite index
      const openTrades = await prisma.trade.findMany({
        where: {
          userId: testUserId,
          symbol: 'INDEX_TEST',
          status: TradeStatus.OPEN,
        },
      });

      const closedTrades = await prisma.trade.findMany({
        where: {
          userId: testUserId,
          symbol: 'INDEX_TEST',
          status: TradeStatus.CLOSED,
        },
      });

      expect(openTrades).toHaveLength(1);
      expect(closedTrades).toHaveLength(1);
      expect(openTrades[0].id).toBe(trade1.id);
      expect(closedTrades[0].id).toBe(trade2.id);
    });

    it('should efficiently query orders by tradeId', async () => {
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'TRADE_ID_INDEX',
          side: TradeSide.LONG,
          status: TradeStatus.OPEN,
          orderFilledTime: new Date(),
          quantityFilled: 200,
          entryDate: new Date(),
          date: new Date(),
          volume: 200,
          pnl: 0,
        },
      });
      createdRecords.trades.push(trade.id);

      // Create multiple orders linked to the same trade
      const order1 = await prisma.order.create({
        data: {
          userId: testUserId,
          orderId: 'index-order-1',
          symbol: 'TRADE_ID_INDEX',
          orderType: 'MARKET',
          side: OrderSide.BUY,
          timeInForce: 'DAY',
          orderQuantity: 100,
          orderStatus: OrderStatus.FILLED,
          orderPlacedTime: new Date(),
          orderExecutedTime: new Date(),
          limitPrice: 150.00,
          tradeId: trade.id,
        },
      });

      const order2 = await prisma.order.create({
        data: {
          userId: testUserId,
          orderId: 'index-order-2',
          symbol: 'TRADE_ID_INDEX',
          orderType: 'MARKET',
          side: OrderSide.BUY,
          timeInForce: 'DAY',
          orderQuantity: 100,
          orderStatus: OrderStatus.FILLED,
          orderPlacedTime: new Date(),
          orderExecutedTime: new Date(),
          limitPrice: 151.00,
          tradeId: trade.id,
        },
      });

      createdRecords.orders.push(order1.id, order2.id);

      // Query by tradeId (should use index)
      const ordersForTrade = await prisma.order.findMany({
        where: { tradeId: trade.id },
        orderBy: { orderExecutedTime: 'asc' },
      });

      expect(ordersForTrade).toHaveLength(2);
      expect(ordersForTrade.map(o => o.orderId)).toEqual(['index-order-1', 'index-order-2']);
    });
  });

  describe('Data integrity', () => {
    it('should preserve existing data when schema is updated', async () => {
      // Create a trade with traditional fields
      const traditionalTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'LEGACY_TEST',
          side: TradeSide.LONG,
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 50,
          // Note: Not setting the new enhanced fields
        },
      });
      createdRecords.trades.push(traditionalTrade.id);

      // Verify traditional fields are preserved and new fields are null/default
      expect(traditionalTrade.symbol).toBe('LEGACY_TEST');
      expect(traditionalTrade.side).toBe(TradeSide.LONG);
      expect(traditionalTrade.quantityFilled).toBe(100);
      expect(traditionalTrade.pnl).toBe(50);
      expect(traditionalTrade.status).toBe(TradeStatus.OPEN); // Default value
      expect(traditionalTrade.avgEntryPrice).toBeNull();
      expect(traditionalTrade.avgExitPrice).toBeNull();
      expect(traditionalTrade.openQuantity).toBeNull();
      expect(traditionalTrade.closeQuantity).toBeNull();
    });

    it('should handle decimal precision for avgEntryPrice and avgExitPrice', async () => {
      const precisionTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'PRECISION_TEST',
          side: TradeSide.LONG,
          status: TradeStatus.CLOSED,
          avgEntryPrice: new Decimal('123.456789'),
          avgExitPrice: new Decimal('124.987654'),
          orderFilledTime: new Date(),
          quantityFilled: 100,
          entryDate: new Date(),
          date: new Date(),
          volume: 100,
          pnl: 153, // Approximate
        },
      });
      createdRecords.trades.push(precisionTrade.id);

      expect(precisionTrade.avgEntryPrice?.toNumber()).toBeCloseTo(123.456789, 6);
      expect(precisionTrade.avgExitPrice?.toNumber()).toBeCloseTo(124.987654, 6);
    });
  });
});