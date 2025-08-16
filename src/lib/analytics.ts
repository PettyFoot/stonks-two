import { Trade, DayData } from '@prisma/client';

export interface TradeMetrics {
  // Basic P&L
  totalPnl: number;
  totalVolume: number;
  totalTrades: number;
  totalCommissions: number;

  // Performance Metrics
  winRate: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  profitFactor: number;
  sharpeRatio: number;

  // Risk Metrics
  maxDrawdown: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  bestDay: number;
  worstDay: number;

  // Trading Behavior
  avgPositionSize: number;
  avgHoldTime: number; // in minutes
  avgPositionMfe: number; // Maximum Favorable Excursion
  avgPositionMae: number; // Maximum Adverse Excursion

  // Frequency Metrics
  tradesPerDay: number;
  activeTradingDays: number;
}

export interface PerformanceData {
  date: Date;
  pnl: number;
  cumulativePnl: number;
  trades: number;
  volume: number;
  winRate: number;
}

export class TradingAnalyzer {
  private trades: Trade[];
  private dayData: DayData[];

  constructor(trades: Trade[], dayData: DayData[] = []) {
    this.trades = trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.dayData = dayData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  calculateMetrics(): TradeMetrics {
    if (this.trades.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalPnl = this.trades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
    const totalVolume = this.trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
    const totalTrades = this.trades.length;

    const winningTrades = this.trades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0);
    const losingTrades = this.trades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) < 0);

    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWinningTrade = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0) / winningTrades.length 
      : 0;
    const avgLosingTrade = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0) / losingTrades.length 
      : 0;

    const grossProfit = winningTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const dayMetrics = this.calculateDayMetrics();
    const consecutiveMetrics = this.calculateConsecutiveMetrics();

    return {
      totalPnl,
      totalVolume,
      totalTrades,
      totalCommissions: 0, // Not tracked in current schema
      winRate,
      avgWinningTrade,
      avgLosingTrade,
      profitFactor,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown(),
      maxConsecutiveWins: consecutiveMetrics.maxWins,
      maxConsecutiveLosses: consecutiveMetrics.maxLosses,
      bestDay: dayMetrics.bestDay,
      worstDay: dayMetrics.worstDay,
      avgPositionSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
      avgHoldTime: 0, // Would need entry/exit times to calculate
      avgPositionMfe: 0, // Would need tick data to calculate
      avgPositionMae: 0, // Would need tick data to calculate
      tradesPerDay: this.calculateTradesPerDay(),
      activeTradingDays: this.getUniqueTradingDays().length
    };
  }

  calculatePerformanceData(): PerformanceData[] {
    const dayGroups = this.groupTradesByDay();
    const performanceData: PerformanceData[] = [];
    let cumulativePnl = 0;

    Object.keys(dayGroups).sort().forEach(dateStr => {
      const dayTrades = dayGroups[dateStr];
      const dayPnl = dayTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
      const dayVolume = dayTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
      const winningTrades = dayTrades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0).length;
      const winRate = dayTrades.length > 0 ? (winningTrades / dayTrades.length) * 100 : 0;
      
      cumulativePnl += dayPnl;

      performanceData.push({
        date: new Date(dateStr),
        pnl: dayPnl,
        cumulativePnl,
        trades: dayTrades.length,
        volume: dayVolume,
        winRate
      });
    });

    return performanceData;
  }

  calculateMonthlyMetrics(): { month: string; pnl: number; trades: number; winRate: number }[] {
    const monthlyData: { [key: string]: Trade[] } = {};

    this.trades.forEach(trade => {
      const monthKey = new Date(trade.date).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(trade);
    });

    return Object.keys(monthlyData).sort().map(month => {
      const monthTrades = monthlyData[month];
      const monthPnl = monthTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
      const winningTrades = monthTrades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0).length;
      const winRate = monthTrades.length > 0 ? (winningTrades / monthTrades.length) * 100 : 0;

      return {
        month,
        pnl: monthPnl,
        trades: monthTrades.length,
        winRate
      };
    });
  }

  calculateSymbolPerformance(): { symbol: string; pnl: number; trades: number; winRate: number }[] {
    const symbolData: { [key: string]: Trade[] } = {};

    this.trades.forEach(trade => {
      if (!symbolData[trade.symbol]) {
        symbolData[trade.symbol] = [];
      }
      symbolData[trade.symbol].push(trade);
    });

    return Object.keys(symbolData).map(symbol => {
      const symbolTrades = symbolData[symbol];
      const symbolPnl = symbolTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
      const winningTrades = symbolTrades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0).length;
      const winRate = symbolTrades.length > 0 ? (winningTrades / symbolTrades.length) * 100 : 0;

      return {
        symbol,
        pnl: symbolPnl,
        trades: symbolTrades.length,
        winRate
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }

  private getEmptyMetrics(): TradeMetrics {
    return {
      totalPnl: 0,
      totalVolume: 0,
      totalTrades: 0,
      totalCommissions: 0,
      winRate: 0,
      avgWinningTrade: 0,
      avgLosingTrade: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      bestDay: 0,
      worstDay: 0,
      avgPositionSize: 0,
      avgHoldTime: 0,
      avgPositionMfe: 0,
      avgPositionMae: 0,
      tradesPerDay: 0,
      activeTradingDays: 0
    };
  }

  private groupTradesByDay(): { [dateStr: string]: Trade[] } {
    const dayGroups: { [dateStr: string]: Trade[] } = {};

    this.trades.forEach(trade => {
      const dateStr = new Date(trade.date).toISOString().split('T')[0];
      if (!dayGroups[dateStr]) {
        dayGroups[dateStr] = [];
      }
      dayGroups[dateStr].push(trade);
    });

    return dayGroups;
  }

  private calculateDayMetrics(): { bestDay: number; worstDay: number } {
    const dayGroups = this.groupTradesByDay();
    let bestDay = 0;
    let worstDay = 0;

    Object.values(dayGroups).forEach(dayTrades => {
      const dayPnl = dayTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
      bestDay = Math.max(bestDay, dayPnl);
      worstDay = Math.min(worstDay, dayPnl);
    });

    return { bestDay, worstDay };
  }

  private calculateConsecutiveMetrics(): { maxWins: number; maxLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    this.trades.forEach(trade => {
      if ((typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if ((typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) < 0) {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      } else {
        // Break even trade resets both counters
        currentWins = 0;
        currentLosses = 0;
      }
    });

    return { maxWins, maxLosses };
  }

  private calculateSharpeRatio(): number {
    const performanceData = this.calculatePerformanceData();
    if (performanceData.length < 2) return 0;

    const returns = performanceData.map((day, index) => 
      index === 0 ? 0 : day.pnl - performanceData[index - 1].pnl
    ).slice(1);

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  private calculateMaxDrawdown(): number {
    const performanceData = this.calculatePerformanceData();
    let maxDrawdown = 0;
    let peak = 0;

    performanceData.forEach(day => {
      peak = Math.max(peak, day.cumulativePnl);
      const drawdown = peak - day.cumulativePnl;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    return maxDrawdown;
  }

  private calculateTradesPerDay(): number {
    const uniqueDays = this.getUniqueTradingDays();
    return uniqueDays.length > 0 ? this.trades.length / uniqueDays.length : 0;
  }

  private getUniqueTradingDays(): string[] {
    const uniqueDays = new Set<string>();
    this.trades.forEach(trade => {
      uniqueDays.add(new Date(trade.date).toISOString().split('T')[0]);
    });
    return Array.from(uniqueDays);
  }
}

// Utility functions for quick calculations
export function calculatePnL(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl), 0);
}

export function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl) > 0).length;
  return (winningTrades / trades.length) * 100;
}

export function calculateVolume(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}