export interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  executions: number;
  pnl: number;
  entryPrice?: number;
  exitPrice?: number;
  holdingPeriod?: string;
  status?: 'OPEN' | 'CLOSED';
  volume?: number;
  shared?: boolean;
  notes?: string;
  tags?: string[];
  commission?: number;
  fees?: number;
  marketSession?: 'PRE_MARKET' | 'REGULAR' | 'AFTER_HOURS' | 'EXTENDED';
  orderType?: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'MARKET_ON_CLOSE' | 'LIMIT_ON_CLOSE' | 'PEGGED_TO_MIDPOINT';
}

export interface DayData {
  date: string;
  pnl: number;
  trades: number;
  volume: number;
  winRate?: number;
  commissions?: number;
}

export interface KPIData {
  totalPnl: number;
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  bestDay: number;
  worstDay: number;
  avgPositionMae: number;
  avgPositionMfe: number;
  // New fields for enhanced dashboard
  performanceByDayOfWeek: Array<{ 
    day: string; 
    dayNum: number;
    pnl: number; 
    trades: number;
    avgPnl: number;
    winRate: number;
    wins: number;
    losses: number;
  }>;
  performanceByMonthOfYear: Array<{ 
    month: string;
    monthNum: number;
    pnl: number; 
    trades: number;
    avgPnl: number;
    winRate: number;
    wins: number;
    losses: number;
  }>;
  avgHoldTimeWinning: number; // in seconds
  avgHoldTimeLosing: number;  // in seconds
  largestGain: number;
  largestLoss: number;
  performanceByDuration: Array<{ 
    category: string; 
    pnl: number; 
    trades: number;
    avgPnl: number;
    winRate: number;
    wins: number;
    losses: number;
    avgHoldTime: number;
  }>;
  winningTradesCount: number;
  losingTradesCount: number;
  profitFactor: number;
  avgDailyVolume: number;
}



export interface RecordsEntry {
  id: string;
  date: string;
  pnl: number;
  totalTrades: number;
  totalVolume: number;
  winRate?: number;
  mfeRatio?: number;
  netPnl?: number;
  commissions?: number;
  notes?: string;
  chartImage?: string;
  trades: Trade[];
}

export interface FilterOptions {
  symbol?: string;
  side?: 'all' | 'long' | 'short';
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  duration?: 'all' | 'intraday' | 'swing';
  showOpenTrades?: boolean;
  // Enhanced filtering options
  priceRange?: { min: number; max: number };
  volumeRange?: { min: number; max: number };
  executionCountRange?: { min: number; max: number };
  timeRange?: { start: string; end: string }; // time of day, not date
}

export interface TradeFilters {
  symbols?: string[];
  tags?: string[];
  priceRange?: { min: number; max: number };
  timeRange?: { start: string; end: string };
  volumeRange?: { min: number; max: number };
  executionCountRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  side?: 'all' | 'long' | 'short';
  duration?: 'all' | 'intraday' | 'swing';
  showOpenTrades?: boolean;
}

export interface TradesMetadata {
  symbols: string[];
  tags: Array<{ name: string; count: number }>;
  priceRange: { min: number; max: number };
  volumeRange: { min: number; max: number };
  executionCountRange: { min: number; max: number };
  dateRange: { earliest: string | null; latest: string | null };
}

export interface ColumnConfiguration {
  id: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

export type ViewMode = 'table' | 'gross' | 'net';
export type ReportType = 'overview' | 'detailed' | 'win-vs-loss-days' | 'drawdown' | 'compare' | 'tag-breakdown' | 'advanced';
export type DateRangeType = 'recent' | 'year-month-day' | 'calendar';

// New types for enhanced filtering and analytics
export type StandardTimeframe = '30d' | '60d' | '90d';
export type FilterTimeframe = '1w' | '2w' | '1m' | '3m' | '6m' | 'last-year' | 'ytd' | 'yesterday';
export type PredefinedTimeframe = StandardTimeframe | FilterTimeframe;

export interface TimeframeOption {
  value: FilterTimeframe; // Only filter timeframes appear in dropdown
  label: string;
  days?: number;
  description?: string;
}

export interface ReportsFilterOptions extends FilterOptions {
  predefinedTimeframe?: PredefinedTimeframe; // Accepts both standard and filter timeframes
  customTimeRange?: boolean;
}

// Analytics data interfaces
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  volume?: number;
  count?: number;
}

export interface DistributionData {
  category?: string;
  range?: string;
  count: number;
  percentage: number;
  pnl?: number;
  avgPnl?: number;
  value?: number;
}

export interface PerformanceMetrics {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  avgDailyPnl: number;
  avgTradePnl: number;
  largestGain: number;
  largestLoss: number;
  winningTrades: number;
  losingTrades: number;
  totalWins: number;
  totalLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldTime: string;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  kellyPercentage: number;
  systemQualityNumber: number;
  totalCommissions: number;
  totalFees: number;
  avgPerSharePnl: number;
}

export interface AnalyticsData {
  overview: {
    dailyPnl: ChartDataPoint[];
    cumulativePnl: ChartDataPoint[];
    dailyVolume: ChartDataPoint[];
    winPercentage: ChartDataPoint[];
  };
  distribution: {
    byMonth: DistributionData[];
    byDayOfWeek: DistributionData[];
    byHourOfDay: DistributionData[];
    byDuration: DistributionData[];
    byIntradayDuration: DistributionData[];
  };
  performance: {
    byMonth: ChartDataPoint[];
    byDayOfWeek: ChartDataPoint[];
    byHourOfDay: ChartDataPoint[];
    byDuration: ChartDataPoint[];
    byIntradayDuration: ChartDataPoint[];
  };
  statistics: PerformanceMetrics;
  winLossStats: WinLossMetrics;
  timeframe: {
    start: Date;
    end: Date;
    period: string;
  };
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    symbol?: string;
    side?: string;
  };
}

export interface WinLossMetrics {
  winningDays: PerformanceMetrics;
  losingDays: PerformanceMetrics;
  dayCount: {
    winning: number;
    losing: number;
    breakeven: number;
    total: number;
  };
}