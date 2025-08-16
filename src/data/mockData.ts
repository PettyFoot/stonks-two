import { Trade, DayData, KPIData, JournalEntry } from '@/types';

// Generate realistic mock trades
export const mockTrades: Trade[] = [
  {
    id: '1',
    date: '07 Apr 2025',
    time: '12:33:16',
    symbol: 'JNVR',
    side: 'long',
    quantity: 52,
    executions: 2,
    pnl: 33.26,
    tags: ['momentum', 'breakout']
  },
  {
    id: '2',
    date: '07 Apr 2025',
    time: '12:22:05',
    symbol: 'JNVR',
    side: 'long',
    quantity: 114,
    executions: 3,
    pnl: 28.52,
    tags: ['scalp']
  },
  {
    id: '3',
    date: '07 Apr 2025',
    time: '12:20:58',
    symbol: 'JNVR',
    side: 'short',
    quantity: 56,
    executions: 4,
    pnl: -12.60,
    tags: ['reversal']
  },
  {
    id: '4',
    date: '07 Apr 2025',
    time: '12:18:59',
    symbol: 'JNVR',
    side: 'long',
    quantity: 58,
    executions: 2,
    pnl: 24.04,
    tags: ['momentum']
  },
  {
    id: '5',
    date: '07 Apr 2025',
    time: '12:18:33',
    symbol: 'JNVR',
    side: 'short',
    quantity: 58,
    executions: 2,
    pnl: -19.14,
    tags: ['reversal', 'failed']
  },
  {
    id: '6',
    date: '07 Apr 2025',
    time: '12:16:44',
    symbol: 'JNVR',
    side: 'short',
    quantity: 60,
    executions: 5,
    pnl: -36.25,
    tags: ['overtrading']
  },
  {
    id: '7',
    date: '07 Apr 2025',
    time: '08:49:57',
    symbol: 'JNVR',
    side: 'long',
    quantity: 610,
    executions: 6,
    pnl: 37.55,
    tags: ['morning', 'gap-up']
  },
  {
    id: '8',
    date: '07 Apr 2025',
    time: '08:49:40',
    symbol: 'JNVR',
    side: 'long',
    quantity: 596,
    executions: 8,
    pnl: 51.36,
    tags: ['morning', 'momentum']
  },
  {
    id: '9',
    date: '07 Apr 2025',
    time: '08:46:00',
    symbol: 'JNVR',
    side: 'long',
    quantity: 536,
    executions: 3,
    pnl: 144.72,
    tags: ['morning', 'breakout']
  },
  {
    id: '10',
    date: '07 Apr 2025',
    time: '08:44:19',
    symbol: 'JNVR',
    side: 'short',
    quantity: 632,
    executions: 9,
    pnl: -111.30,
    tags: ['morning', 'failed']
  },
  {
    id: '11',
    date: '07 Apr 2025',
    time: '08:43:29',
    symbol: 'JNVR',
    side: 'short',
    quantity: 184,
    executions: 5,
    pnl: -39.60,
    tags: ['pullback']
  },
  {
    id: '12',
    date: '07 Apr 2025',
    time: '08:43:03',
    symbol: 'JNVR',
    side: 'short',
    quantity: 204,
    executions: 7,
    pnl: -30.78,
    tags: ['pullback']
  },
  {
    id: '13',
    date: '07 Apr 2025',
    time: '08:19:56',
    symbol: 'AREB',
    side: 'short',
    quantity: 90,
    executions: 5,
    pnl: -49.01,
    tags: ['premarket']
  },
  {
    id: '14',
    date: '07 Apr 2025',
    time: '08:19:16',
    symbol: 'AREB',
    side: 'short',
    quantity: 94,
    executions: 2,
    pnl: -17.39,
    tags: ['premarket']
  },
  // Additional trades for more variety
  {
    id: '15',
    date: '08 Apr 2025',
    time: '10:15:32',
    symbol: 'TSLA',
    side: 'long',
    quantity: 200,
    executions: 3,
    pnl: 87.45,
    tags: ['large-cap', 'momentum']
  },
  {
    id: '16',
    date: '08 Apr 2025',
    time: '09:45:12',
    symbol: 'NVDA',
    side: 'long',
    quantity: 150,
    executions: 4,
    pnl: 156.78,
    tags: ['tech', 'breakout']
  },
  {
    id: '17',
    date: '09 Apr 2025',
    time: '14:22:18',
    symbol: 'AAPL',
    side: 'short',
    quantity: 300,
    executions: 2,
    pnl: -45.23,
    tags: ['large-cap', 'reversal']
  },
  {
    id: '18',
    date: '09 Apr 2025',
    time: '11:33:44',
    symbol: 'SPCE',
    side: 'long',
    quantity: 500,
    executions: 6,
    pnl: 234.56,
    tags: ['small-cap', 'volatility']
  },
  // Continue adding more trades to reach ~50 total
  ...Array.from({ length: 32 }, (_, i) => ({
    id: `${19 + i}`,
    date: `${10 + Math.floor(i / 5)} Apr 2025`,
    time: `${9 + Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    symbol: ['JNVR', 'AREB', 'TSLA', 'NVDA', 'AAPL', 'SPCE', 'AMD', 'MSFT'][Math.floor(Math.random() * 8)],
    side: Math.random() > 0.5 ? 'long' : 'short' as 'long' | 'short',
    quantity: Math.floor(Math.random() * 800) + 50,
    executions: Math.floor(Math.random() * 8) + 1,
    pnl: (Math.random() - 0.4) * 200, // Slightly profitable bias
    tags: [['momentum', 'breakout'], ['scalp', 'quick'], ['reversal', 'pullback'], ['morning', 'gap']][Math.floor(Math.random() * 4)]
  }))
];

// Generate daily summaries
export const mockDayData: DayData[] = [
  {
    date: '2025-04-05',
    pnl: 0,
    trades: 0,
    quantity: 0,
    winRate: 0
  },
  {
    date: '2025-04-06',
    pnl: 0,
    trades: 0,
    quantity: 0,
    winRate: 0
  },
  {
    date: '2025-04-07',
    pnl: 3.72,
    trades: 14,
    quantity: 3344,
    winRate: 42.86
  },
  {
    date: '2025-04-08',
    pnl: 244.23,
    trades: 2,
    quantity: 350,
    winRate: 100
  },
  {
    date: '2025-04-09',
    pnl: 189.33,
    trades: 2,
    quantity: 800,
    winRate: 50
  },
  {
    date: '2025-04-10',
    pnl: 0,
    trades: 0,
    quantity: 0,
    winRate: 0
  },
  {
    date: '2025-04-11',
    pnl: 0,
    trades: 0,
    quantity: 0,
    winRate: 0
  }
];

// KPI summary data
export const mockKPIData: KPIData = {
  totalPnl: 437.28,
  totalTrades: 18,
  totalVolume: 4494,
  winRate: 50.0,
  avgWinningTrade: 53.40,
  avgLosingTrade: -39.58,
  maxConsecutiveWins: 3,
  maxConsecutiveLosses: 5,
  bestDay: 244.23,
  worstDay: -156.45,
  avgPositionMae: -11.42,
  avgPositionMfe: 14.46
};

// Journal entries
export const mockJournalEntries: JournalEntry[] = [
  {
    id: '1',
    date: 'Mon, Apr 7, 2025',
    pnl: 3.72,
    totalTrades: 14,
    totalVolume: 3344,
    winRate: 42.86,
    mfeRatio: 0,
    netPnl: 3.72,
    commissions: 0,
    notes: '',
    trades: mockTrades.slice(0, 14)
  }
];

// Chart data for cumulative P&L
export const mockCumulativePnl = [
  { date: '2025-04-06', value: 0 },
  { date: '2025-04-07', value: 3.72 },
  { date: '2025-04-08', value: 247.95 },
  { date: '2025-04-09', value: 437.28 }
];

// Performance distributions
export const mockGapPerformance = [
  { range: 'less than -2%', value: -670, percentage: 48.65, count: 8 },
  { range: '-1% to -2%', value: 0, percentage: 0, count: 0 },
  { range: '0 to -1%', value: 0, percentage: 0, count: 0 },
  { range: '0 to +1%', value: 0, percentage: 0, count: 0 },
  { range: '+1% to +2%', value: 0, percentage: 0, count: 0 },
  { range: '> +2%', value: 70.72, percentage: 51.35, count: 10 }
];

export const mockDayTypePerformance = [
  { range: 'Inside range', value: -670, percentage: 48.65, count: 8 },
  { range: 'Outside range', value: 70.72, percentage: 51.35, count: 10 },
  { range: 'Trend up', value: 0, percentage: 0, count: 0 },
  { range: 'Trend down', value: 0, percentage: 0, count: 0 }
];

export const mockVolumePerformance = [
  { range: '0 to 49K', value: 0, percentage: 0, count: 0 },
  { range: '50K - 99K', value: 0, percentage: 0, count: 0 },
  { range: '100K - 249K', value: 0, percentage: 0, count: 0 },
  { range: '250K - 499K', value: 0, percentage: 0, count: 0 },
  { range: '500K - 1M', value: 0, percentage: 0, count: 0 },
  { range: '1M - 2.49M', value: 0, percentage: 0, count: 0 },
  { range: '2.5M - 4.9M', value: -670, percentage: 48.65, count: 18 }
];

export const mockMonthlyPerformance = [
  { range: 'Jan', value: 0, percentage: 0, count: 0 },
  { range: 'Feb', value: 0, percentage: 0, count: 0 },
  { range: 'Mar', value: 0, percentage: 0, count: 0 },
  { range: 'Apr', value: 437.28, percentage: 100, count: 18 },
  { range: 'May', value: 0, percentage: 0, count: 0 },
  { range: 'Jun', value: 0, percentage: 0, count: 0 },
  { range: 'Jul', value: 0, percentage: 0, count: 0 },
  { range: 'Aug', value: 0, percentage: 0, count: 0 },
  { range: 'Sep', value: 0, percentage: 0, count: 0 },
  { range: 'Oct', value: 0, percentage: 0, count: 0 },
  { range: 'Nov', value: 0, percentage: 0, count: 0 },
  { range: 'Dec', value: 0, percentage: 0, count: 0 }
];

export const mockSymbolPerformance = [
  { range: '$0.00 - $0.09', value: 0, percentage: 0, count: 0 },
  { range: '$0.10 - $0.24', value: 0, percentage: 0, count: 0 },
  { range: '$0.25 - $0.49', value: 0, percentage: 0, count: 0 },
  { range: '$0.50 - $0.99', value: 0, percentage: 0, count: 0 },
  { range: '$1.00 - $2.49', value: 0, percentage: 0, count: 0 },
  { range: '$2.50 - $4.99', value: 0, percentage: 0, count: 0 },
  { range: '$5.00+', value: 437.28, percentage: 100, count: 18 }
];

export const commonTags = ['momentum', 'breakout', 'scalp', 'reversal', 'morning', 'gap-up', 'pullback', 'premarket', 'large-cap', 'tech', 'small-cap', 'volatility', 'failed', 'overtrading', 'quick'];