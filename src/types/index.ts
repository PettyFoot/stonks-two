export interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  side: 'long' | 'short';
  volume: number;
  executions: number;
  pnl: number;
  shared?: boolean;
  notes?: string;
  tags?: string[];
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
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DistributionData {
  range: string;
  value: number;
  percentage: number;
  count: number;
}

export interface JournalEntry {
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
  duration?: 'all' | 'intraday' | 'multiday';
}

export type ViewMode = 'table' | 'charts-large' | 'charts-small' | 'gross' | 'net';
export type ReportType = 'overview' | 'detailed' | 'win-vs-loss-days' | 'drawdown' | 'compare' | 'tag-breakdown' | 'advanced';
export type DateRangeType = 'recent' | 'year-month-day' | 'calendar';