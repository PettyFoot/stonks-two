import { TradeBuilder, processUserOrders } from '@/lib/tradeBuilder';
import { ordersRepo } from '@/lib/repositories/ordersRepo';
import { tradesRepo } from '@/lib/repositories/tradesRepo';
import { Order, OrderSide, OrderStatus, TradeStatus, TradeSide, BrokerType, OrderType, TimeInForce } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the repositories
jest.mock('@/lib/repositories/ordersRepo');
jest.mock('@/lib/repositories/tradesRepo');

const mockOrdersRepo = ordersRepo as jest.Mocked<typeof ordersRepo>;
const mockTradesRepo = tradesRepo as jest.Mocked<typeof tradesRepo>;

describe('TradeBuilder', () => {
  let tradeBuilder: TradeBuilder;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    tradeBuilder = new TradeBuilder();
    jest.clearAllMocks();
    
    // Default mock implementations
    mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([]);
    mockTradesRepo.getAllOpenTrades.mockResolvedValue([]);
    mockTradesRepo.saveTrade.mockResolvedValue({
      id: 'mock-trade-id',
    } as any);
    mockOrdersRepo.updateOrdersWithTradeId.mockResolvedValue();
  });

  describe('processUserOrders', () => {
    it('should handle empty orders list', async () => {
      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toEqual([]);
      expect(mockOrdersRepo.getUnprocessedOrders).toHaveBeenCalledWith(testUserId);
    });

    it('should process a simple buy order and create open position', async () => {
      const mockOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'order-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([mockOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.LONG,
        status: TradeStatus.OPEN,
        openQuantity: 100,
        avgEntryPrice: 150.00,
        pnl: 0,
        ordersInTrade: ['order-123'],
      });
    });

    it('should process buy then sell orders and create closed trade', async () => {
      const buyOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'buy-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      const sellOrder: Order = {
        ...buyOrder,
        id: 'order-2',
        orderId: 'sell-123',
        side: OrderSide.SELL,
        limitPrice: new Decimal(160.00),
        orderExecutedTime: new Date('2023-01-01T11:00:00Z'),
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([buyOrder, sellOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.LONG,
        status: TradeStatus.CLOSED,
        openQuantity: 100,
        closeQuantity: 100,
        avgEntryPrice: 150.00,
        avgExitPrice: 160.00,
        pnl: 1000.00, // (160 - 150) * 100
        ordersInTrade: ['buy-123', 'sell-123'],
      });
    });

    it('should handle partial closes correctly', async () => {
      const buyOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'buy-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      const partialSellOrder: Order = {
        ...buyOrder,
        id: 'order-2',
        orderId: 'sell-123',
        side: OrderSide.SELL,
        orderQuantity: 50,
        limitPrice: new Decimal(160.00),
        orderExecutedTime: new Date('2023-01-01T11:00:00Z'),
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([buyOrder, partialSellOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      // Should create one closed trade and still have an open position
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.LONG,
        status: TradeStatus.CLOSED,
        openQuantity: 50,
        closeQuantity: 50,
        pnl: 500.00, // (160 - 150) * 50
      });
    });

    it('should handle position reversal (sell more than long position)', async () => {
      const buyOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'buy-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      const oversellOrder: Order = {
        ...buyOrder,
        id: 'order-2',
        orderId: 'sell-123',
        side: OrderSide.SELL,
        orderQuantity: 150,
        limitPrice: new Decimal(160.00),
        orderExecutedTime: new Date('2023-01-01T11:00:00Z'),
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([buyOrder, oversellOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toHaveLength(2);
      
      // First trade should be closed (long position closed)
      expect(result[0]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.LONG,
        status: TradeStatus.CLOSED,
        openQuantity: 100,
        closeQuantity: 100,
        pnl: 1000.00,
      });
      
      // Second trade should be new short position
      expect(result[1]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.SHORT,
        status: TradeStatus.OPEN,
        openQuantity: 50,
        avgEntryPrice: 160.00,
        pnl: 0,
      });
    });

    it('should handle short positions correctly', async () => {
      const sellOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'sell-123',
        symbol: 'AAPL',
        side: OrderSide.SELL,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      const coverOrder: Order = {
        ...sellOrder,
        id: 'order-2',
        orderId: 'buy-123',
        side: OrderSide.BUY,
        limitPrice: new Decimal(140.00),
        orderExecutedTime: new Date('2023-01-01T11:00:00Z'),
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([sellOrder, coverOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'AAPL',
        side: TradeSide.SHORT,
        status: TradeStatus.CLOSED,
        avgEntryPrice: 150.00,
        avgExitPrice: 140.00,
        pnl: 1000.00, // (150 - 140) * 100 for short
      });
    });

    it('should skip orders without execution time or price', async () => {
      const invalidOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'invalid-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: null, // Missing price
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([invalidOrder]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toEqual([]);
    });
  });

  describe('idempotency', () => {
    it('should not process orders that already have tradeId', async () => {
      // Mock that no unprocessed orders exist (already processed)
      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([]);
      
      const result = await tradeBuilder.processUserOrders(testUserId);
      
      expect(result).toEqual([]);
      expect(mockOrdersRepo.getUnprocessedOrders).toHaveBeenCalledWith(testUserId);
    });

    it('should be safe to run multiple times', async () => {
      const mockOrder: Order = {
        id: 'order-1',
        userId: testUserId,
        orderId: 'order-123',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderQuantity: 100,
        limitPrice: new Decimal(150.00),
        orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
        orderStatus: OrderStatus.FILLED,
        tradeId: null,
        orderCancelledTime: null,
        parentOrderId: null,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        stopPrice: null,
        orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
        orderUpdatedTime: null,
        accountId: null,
        orderAccount: null,
        orderRoute: null,
        brokerType: BrokerType.GENERIC_CSV,
        tags: [],
        importBatchId: null,
        usedInTrade: false,
      };

      // First run - order exists
      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([mockOrder]);
      const firstResult = await tradeBuilder.processUserOrders(testUserId);
      expect(firstResult).toHaveLength(1);

      // Second run - order already processed (empty list)
      mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([]);
      const secondResult = await tradeBuilder.processUserOrders(testUserId);
      expect(secondResult).toEqual([]);
    });
  });
});

describe('processUserOrders integration', () => {
  const testUserId = 'test-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process orders and persist trades', async () => {
    const mockOrder: Order = {
      id: 'order-1',
      userId: testUserId,
      orderId: 'order-123',
      symbol: 'AAPL',
      side: OrderSide.BUY,
      orderQuantity: 100,
      limitPrice: new Decimal(150.00),
      orderExecutedTime: new Date('2023-01-01T10:00:00Z'),
      orderStatus: OrderStatus.FILLED,
      tradeId: null,
      orderCancelledTime: null,
      parentOrderId: null,
      orderType: OrderType.MARKET,
      timeInForce: TimeInForce.DAY,
      stopPrice: null,
      orderPlacedTime: new Date('2023-01-01T09:00:00Z'),
      orderUpdatedTime: null,
      accountId: null,
      orderAccount: null,
      orderRoute: null,
      tags: [],
      usedInTrade: false,
      brokerType: BrokerType.GENERIC_CSV,
      importBatchId: null,
    };

    mockOrdersRepo.getUnprocessedOrders.mockResolvedValue([mockOrder]);
    mockTradesRepo.getAllOpenTrades.mockResolvedValue([]);
    mockTradesRepo.saveTrade.mockResolvedValue({
      id: 'saved-trade-123',
    } as any);

    const result = await processUserOrders(testUserId);

    expect(result).toHaveLength(1);
    expect(mockTradesRepo.saveTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUserId,
        symbol: 'AAPL',
        side: TradeSide.LONG,
        status: TradeStatus.OPEN,
      })
    );
    expect(mockOrdersRepo.updateOrdersWithTradeId).toHaveBeenCalledWith(
      ['order-123'],
      'saved-trade-123'
    );
  });
});