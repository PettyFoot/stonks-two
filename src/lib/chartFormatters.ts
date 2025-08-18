/**
 * Chart formatting utilities for consistent data display across all reports charts
 */

export type ChartType = 'volume' | 'normalizedVolume' | 'percentage' | 'currency' | 'shares';

export interface ChartFormatter {
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  formatTooltipValue: (value: number, name?: string) => [string, string];
}

/**
 * Format chart values based on chart type
 */
export const formatChartValue = (value: number, type: ChartType): string => {
  switch (type) {
    case 'volume':
    case 'shares':
      return `${value.toLocaleString()} shares`;
    case 'normalizedVolume':
      return `${value.toLocaleString('en-US', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 2 
      })} shares/day`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
    default:
      return `$${value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
  }
};

/**
 * Format axis values with abbreviated notation
 */
export const formatAxisValue = (value: number, type: ChartType): string => {
  switch (type) {
    case 'volume':
    case 'shares':
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toString();
    case 'normalizedVolume':
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M/day`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K/day`;
      return `${value.toFixed(1)}/day`;
    case 'percentage':
      return `${value}%`;
    case 'currency':
    default:
      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
      return `$${value}`;
  }
};

/**
 * Format tooltip values with proper labels
 */
export const formatTooltipValue = (
  value: number, 
  type: ChartType, 
  customName?: string
): [string, string] => {
  const formattedValue = formatChartValue(value, type);
  let label = customName;
  
  if (!label) {
    switch (type) {
      case 'volume':
      case 'shares':
        label = 'Volume';
        break;
      case 'normalizedVolume':
        label = 'Daily Volume';
        break;
      case 'percentage':
        label = 'Win Rate';
        break;
      case 'currency':
      default:
        label = 'P&L';
        break;
    }
  }
  
  return [formattedValue, label];
};

/**
 * Create a complete formatter object for a chart type
 */
export const createChartFormatter = (type: ChartType): ChartFormatter => ({
  formatValue: (value: number) => formatChartValue(value, type),
  formatAxisValue: (value: number) => formatAxisValue(value, type),
  formatTooltipValue: (value: number, name?: string) => formatTooltipValue(value, type, name)
});

/**
 * Predefined formatters for common chart types
 */
export const CHART_FORMATTERS = {
  volume: createChartFormatter('volume'),
  normalizedVolume: createChartFormatter('normalizedVolume'),
  percentage: createChartFormatter('percentage'),
  currency: createChartFormatter('currency'),
  shares: createChartFormatter('shares')
} as const;

/**
 * Format time axis labels consistently
 */
export const formatTimeAxis = (
  dateString: string, 
  format: 'short' | 'long' | 'minimal' = 'short'
): string => {
  const date = new Date(dateString);
  
  switch (format) {
    case 'minimal':
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric' 
      });
    case 'long':
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: '2-digit' 
      });
    case 'short':
    default:
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
  }
};

/**
 * Determine time format based on date range
 */
export const getTimeFormat = (
  startDate: string, 
  endDate: string
): 'short' | 'long' | 'minimal' => {
  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff <= 30) return 'minimal';
  if (daysDiff <= 90) return 'short';
  return 'long';
};