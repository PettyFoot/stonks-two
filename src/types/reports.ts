/**
 * TypeScript Type Definitions for Report APIs
 * 
 * These types ensure type safety across the application
 * and provide IntelliSense support in IDEs.
 */

// Win/Loss Report Types
export interface WinLossMetrics {
  winRate: number;
  lossRate: number;
  winLossRatio: number;
  avgWin: number;
  avgLoss: number;
  expectation: number;
  profitFactor: number;
  totalTrades: number;
  wins: number;
  losses: number;
  scratches: number;
  largestWin: number;
  largestLoss: number;
  avgRiskRewardRatio: number;
}

export interface CumulativeDataPoint {
  date: string;
  cumulativePnl: number;
  drawdown: number;
  drawdownPercent: number;
  trades: number;
}

export interface PnlDistribution {
  range: string;
  count: number;
  avgPnl: number;
}

export interface StreakMetrics {
  maxWinStreak: number;
  maxLossStreak: number;
  avgWinStreak: number;
  avgLossStreak: number;
  currentStreak: {
    type: string;
    count: number;
  };
}

export interface DurationAnalysis {
  duration: string;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalPnl: number;
}

export interface WinLossReportResponse {
  metrics: WinLossMetrics;
  cumulative: CumulativeDataPoint[];
  distribution: PnlDistribution[];
  streaks: StreakMetrics;
  durationAnalysis: DurationAnalysis[];
}

// Dashboard Metrics Types
export interface DashboardMetrics {
  total_trades: number;
  trading_days: number;
  wins: number;
  losses: number;
  total_pnl: number;
  avg_pnl: number;
  pnl_stddev: number;
  best_trade: number;
  worst_trade: number;
  avg_win: number;
  avg_loss: number;
  gross_profit: number;
  gross_loss: number;
  avg_hold_time: number;
  total_volume: number;
  avg_daily_pnl: number;
  daily_pnl_stddev: number;
  best_day: number;
  worst_day: number;
  win_loss_ratio: number;
  win_rate: number;
  profit_factor: number;
  sharpe_ratio: number;
  expectancy: number;
}

export interface DrawdownMetrics {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  recoveryTime: number | null;
}

export interface RMultipleDistribution {
  rMultiple: string;
  count: number;
  totalPnl: number;
}

export interface RMultipleMetrics {
  distribution: RMultipleDistribution[];
  avgRMultiple: number;
  expectancy: number;
}

export interface MarketConditionPerformance {
  condition: string;
  tradingDays: number;
  totalTrades: number;
  totalPnl: number;
  avgDailyPnl: number;
  sharpeRatio: number;
}

export interface TradeQualityMetrics {
  avgPnlToMfeRatio: number;
  avgPnlToMaeRatio: number;
  avgMfe: number;
  avgMae: number;
  goodExits: number;
  poorEntries: number;
  avgWinTime: number;
  avgLossTime: number;
}

export interface DashboardMetricsResponse {
  dashboard?: DashboardMetrics;
  kelly?: number;
  sharpe?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  drawdown?: DrawdownMetrics;
  rMultiples?: RMultipleMetrics;
  marketConditions?: MarketConditionPerformance[];
  tradeQuality?: TradeQualityMetrics;
  metadata: {
    userId: string;
    filters: {
      dateFrom?: string;
      dateTo?: string;
      symbol: string;
      side: string;
    };
    generatedAt: string;
    metricsIncluded: string[];
  };
  formatted?: any; // Formatted display values
}

// Filter Types
export interface ReportFilters {
  from?: string;
  to?: string;
  symbol?: string;
  side?: 'LONG' | 'SHORT' | 'all';
  tags?: string[];
  duration?: 'intraday' | 'multiday' | 'all';
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// API Hook Return Types
export interface UseReportData<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}