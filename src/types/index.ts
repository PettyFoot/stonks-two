export interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
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