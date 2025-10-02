import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { tradesRepo } from '@/lib/repositories/tradesRepo';
import { ordersRepo } from '@/lib/repositories/ordersRepo';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import {
  calculateConsecutiveStreaks,
  calculatePnlStandardDeviation,
  calculateProfitFactor,
  formatDuration
} from '@/lib/reportCalculations';
import { TradeFilterService, type TradeFilters } from '@/lib/services/tradeFilterService';

// Helper function to generate a secure random share key
function generateShareKey(): string {
  return crypto.randomBytes(9).toString('base64url'); // 12 characters
}

// Helper function to sanitize trade data for sharing (remove PII)
function sanitizeTradeData(trade: any) {
  return {
    id: trade.id,
    date: trade.date,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    executions: trade.executions,
    pnl: trade.pnl,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    timeInTrade: trade.timeInTrade,
    holdingPeriod: trade.holdingPeriod,
    status: trade.status,
    notes: trade.notes,
    tags: trade.tags,
    commission: trade.commission,
    fees: trade.fees,
    marketSession: trade.marketSession,
    orderType: trade.orderType,
    openTime: trade.openTime,
    closeTime: trade.closeTime,
    costBasis: trade.costBasis,
    proceeds: trade.proceeds,
    ordersCount: trade.ordersCount,
    netPnl: trade.netPnl || trade.pnl,
    commissions: trade.commission
  };
}

// Helper function to sanitize order data for sharing (remove PII)
function sanitizeOrderData(orders: any[]) {
  return orders.map(order => ({
    id: order.id,
    orderId: order.orderId,
    symbol: order.symbol,
    orderType: order.orderType,
    side: order.side,
    timeInForce: order.timeInForce,
    orderQuantity: order.orderQuantity,
    limitPrice: order.limitPrice,
    stopPrice: order.stopPrice,
    orderStatus: order.orderStatus,
    orderPlacedTime: order.orderPlacedTime,
    orderExecutedTime: order.orderExecutedTime,
    orderUpdatedTime: order.orderUpdatedTime,
    orderCancelledTime: order.orderCancelledTime,
    orderRoute: order.orderRoute,
    brokerType: order.brokerType,
    tags: order.tags
  }));
}

// Helper function to fetch and sanitize trading statistics
async function fetchStatistics(userId: string, dateFrom?: string, dateTo?: string) {
  // Build where clause for trades
  const where: Prisma.TradeWhereInput = {
    userId: userId,
    status: 'CLOSED',
  };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      where.date.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }

  // Fetch trades
  const trades = await prisma.trade.findMany({
    where,
    select: {
      id: true,
      symbol: true,
      side: true,
      entryDate: true,
      exitDate: true,
      timeInTrade: true,
      pnl: true,
      quantity: true,
      commission: true,
      fees: true,
      date: true,
    },
    orderBy: {
      entryDate: 'desc'
    }
  });

  // Calculate overall statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => Number(t.pnl) > 0);
  const losingTrades = trades.filter(t => Number(t.pnl) < 0);
  const scratchTrades = trades.filter(t => Number(t.pnl) === 0);

  const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const totalCommissions = trades.reduce((sum, t) => sum + Number(t.commission || 0) + Number(t.fees || 0), 0);

  const pnlValues = trades.map(t => Number(t.pnl));
  const largestGain = Math.max(...pnlValues.filter(p => p > 0), 0);
  const largestLoss = Math.min(...pnlValues.filter(p => p < 0), 0);

  const avgTradeGainLoss = totalTrades > 0 ? totalPnl / totalTrades : 0;
  const avgWinningTrade = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / winningTrades.length
    : 0;
  const avgLosingTrade = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / losingTrades.length
    : 0;

  const totalVolume = trades.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const avgPerShareGainLoss = totalVolume > 0 ? totalPnl / totalVolume : 0;

  const winHoldTimes = winningTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
  const loseHoldTimes = losingTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
  const scratchHoldTimes = scratchTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);

  const avgHoldTimeWin = winHoldTimes.length > 0 ? winHoldTimes.reduce((a, b) => a + b, 0) / winHoldTimes.length : 0;
  const avgHoldTimeLose = loseHoldTimes.length > 0 ? loseHoldTimes.reduce((a, b) => a + b, 0) / loseHoldTimes.length : 0;
  const avgHoldTimeScratch = scratchHoldTimes.length > 0 ? scratchHoldTimes.reduce((a, b) => a + b, 0) / scratchHoldTimes.length : 0;

  const uniqueDates = [...new Set(trades.map(t => new Date(t.date).toISOString().split('T')[0]))];
  const avgDailyGainLoss = uniqueDates.length > 0 ? totalPnl / uniqueDates.length : 0;
  const avgDailyVolume = uniqueDates.length > 0 ? totalVolume / uniqueDates.length : 0;

  const transformedTrades = trades.map(trade => ({
    ...trade,
    pnl: trade.pnl?.toNumber() || 0,
    quantity: trade.quantity || 0,
  }));

  const streaks = calculateConsecutiveStreaks(transformedTrades);
  const stdDev = calculatePnlStandardDeviation(transformedTrades);
  const profitFactor = calculateProfitFactor(transformedTrades);

  const stats = {
    totalGainLoss: totalPnl,
    largestGain,
    largestLoss,
    avgDailyGainLoss,
    avgDailyVolume,
    avgPerShareGainLoss,
    avgTradeGainLoss,
    avgWinningTrade,
    avgLosingTrade,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    scratchTrades: scratchTrades.length,
    avgHoldTimeScratch: formatDuration(avgHoldTimeScratch),
    avgHoldTimeWinning: formatDuration(avgHoldTimeWin),
    avgHoldTimeLosing: formatDuration(avgHoldTimeLose),
    maxConsecutiveWins: streaks.maxConsecutiveWins,
    maxConsecutiveLosses: streaks.maxConsecutiveLosses,
    tradePnlStdDev: stdDev,
    profitFactor,
    totalCommissions,
    totalFees: 0,
    totalVolume,
  };

  // Fetch winning/losing days statistics
  const filters: TradeFilters = {
    userId,
    dateFrom,
    dateTo,
    showOpenTrades: false,
  };

  const whereClause = TradeFilterService.buildWhereClause(filters);
  const filteredTrades = await prisma.trade.findMany({
    where: whereClause,
    select: {
      exitDate: true,
      pnl: true,
      quantity: true,
      commission: true,
      fees: true,
      timeInTrade: true,
      entryDate: true
    }
  });

  // Group by day
  const dailyPnlMap = new Map<string, { daily_pnl: number; daily_volume: number }>();
  filteredTrades.forEach(trade => {
    if (!trade.exitDate) return;
    const dateKey = trade.exitDate.toISOString().split('T')[0];
    const existing = dailyPnlMap.get(dateKey) || { daily_pnl: 0, daily_volume: 0 };
    existing.daily_pnl += Number(trade.pnl);
    existing.daily_volume += Number(trade.quantity) || 0;
    dailyPnlMap.set(dateKey, existing);
  });

  const dailyPnlResult = Array.from(dailyPnlMap.entries()).map(([dateStr, data]) => ({
    trade_date: new Date(dateStr),
    daily_pnl: data.daily_pnl,
    daily_volume: data.daily_volume
  }));

  const winningDates = dailyPnlResult.filter(day => day.daily_pnl > 0).map(day => day.trade_date);
  const losingDates = dailyPnlResult.filter(day => day.daily_pnl <= 0).map(day => day.trade_date);

  const convertedTrades = filteredTrades.map(trade => ({
    ...trade,
    pnl: typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl,
    quantity: trade.quantity || 0,
    commission: typeof trade.commission === 'object' && trade.commission ? trade.commission.toNumber() : null,
    fees: typeof trade.fees === 'object' && trade.fees ? trade.fees.toNumber() : null,
  }));

  const winningDaysStats = calculateDayStats(convertedTrades, winningDates);
  const losingDaysStats = calculateDayStats(convertedTrades, losingDates);

  return {
    stats,
    winLossStats: {
      winningDays: winningDaysStats,
      losingDays: losingDaysStats,
      dayCount: {
        total: uniqueDates.length,
        winning: winningDates.length,
        losing: losingDates.length,
      }
    }
  };
}

function calculateDayStats(trades: any[], dates: Date[]) {
  if (dates.length === 0) {
    return {
      totalPnl: 0,
      avgDailyPnl: 0,
      avgDailyVolume: 0,
      avgPerSharePnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      avgHoldTime: '0s',
      profitFactor: 0,
      largestGain: 0,
      largestLoss: 0,
      totalCommissions: 0,
      totalFees: 0,
    };
  }

  const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
  const dayTrades = trades.filter(trade => {
    if (!trade.exitDate) return false;
    const tradeDateString = trade.exitDate.toISOString().split('T')[0];
    return dateStrings.includes(tradeDateString);
  });

  if (dayTrades.length === 0) {
    return {
      totalPnl: 0,
      avgDailyPnl: 0,
      avgDailyVolume: 0,
      avgPerSharePnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      avgHoldTime: '0s',
      profitFactor: 0,
      largestGain: 0,
      largestLoss: 0,
      totalCommissions: 0,
      totalFees: 0,
    };
  }

  let totalPnl = 0;
  let totalVolume = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let largestGain = 0;
  let largestLoss = 0;
  let totalCommissions = 0;
  let totalFees = 0;
  let totalHold = 0;
  let holdCount = 0;

  dayTrades.forEach(trade => {
    const pnl = Number(trade.pnl) || 0;
    const quantity = Number(trade.quantity) || 0;
    const commission = Number(trade.commission) || 0;
    const fees = Number(trade.fees) || 0;

    totalPnl += pnl;
    totalVolume += quantity;
    totalCommissions += commission;
    totalFees += fees;

    const holdTime = trade.timeInTrade || 0;
    totalHold += holdTime;
    holdCount++;

    if (pnl > 0) {
      winningTrades++;
      totalWins += pnl;
      largestGain = Math.max(largestGain, pnl);
    } else if (pnl < 0) {
      losingTrades++;
      totalLosses += Math.abs(pnl);
      largestLoss = Math.min(largestLoss, pnl);
    }
  });

  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const avgHold = holdCount > 0 ? totalHold / holdCount : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

  const uniqueDays = dates.length;

  return {
    totalPnl,
    avgDailyPnl: uniqueDays > 0 ? totalPnl / uniqueDays : 0,
    avgDailyVolume: uniqueDays > 0 ? totalVolume / uniqueDays : 0,
    avgPerSharePnl: totalVolume > 0 ? totalPnl / totalVolume : 0,
    totalTrades: dayTrades.length,
    winningTrades,
    losingTrades,
    avgWin,
    avgLoss: losingTrades > 0 ? -avgLoss : 0,
    avgHoldTime: formatDuration(avgHold),
    profitFactor,
    largestGain,
    largestLoss,
    totalCommissions,
    totalFees,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tradeId, date, dateFrom, dateTo, year, month, shareType = 'record' } = body;

    if (!tradeId && !date && !dateFrom && !dateTo && !year) {
      return NextResponse.json(
        { error: 'Either tradeId, date, date range, or year is required' },
        { status: 400 }
      );
    }

    // Check if user has reached the limit of 20 active shares
    const activeSharesCount = await prisma.sharedTrade.count({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (activeSharesCount >= 20) {
      return NextResponse.json(
        { error: 'You have reached the maximum limit of 20 active shared trades' },
        { status: 429 }
      );
    }

    let trade: any = null;
    let orders: any[] = [];
    let statisticsData: any = null;
    let calendarData: any = null;

    if (shareType === 'calendar-month' && year && month !== undefined) {
      // Handle calendar month sharing
      const params = new URLSearchParams({
        year: year.toString(),
        month: (month + 1).toString() // Convert 0-indexed to 1-indexed
      });

      const monthResponse = await fetch(`${process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/month?${params}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      if (!monthResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch calendar month data' },
          { status: 500 }
        );
      }

      const monthData = await monthResponse.json();

      // Calculate monthly stats
      const monthlyPnl = monthData.reduce((sum: number, d: any) => sum + (Number(d.pnl) || 0), 0);
      const tradingDays = monthData.filter((d: any) => d.tradeCount > 0).length;
      const totalTrades = monthData.reduce((sum: number, d: any) => sum + (Number(d.tradeCount) || 0), 0);
      const avgWinRate = monthData.length > 0
        ? Math.round(monthData.reduce((sum: number, d: any) => sum + (Number(d.winRate) || 0), 0) / monthData.length)
        : 0;

      // Fetch all trades for the month
      const dateFrom = new Date(year, month, 1).toISOString().split('T')[0];
      const dateTo = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const tradesParams = new URLSearchParams({
        dateFrom,
        dateTo
      });

      const tradesResponse = await fetch(`${process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/trades?${tradesParams}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      let sanitizedTrades: any[] = [];
      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        // Remove IDs from trades for privacy in shared view
        sanitizedTrades = (tradesData.trades || []).map((trade: any) => {
          const { id, ...tradeWithoutId } = trade;
          return tradeWithoutId;
        });
      }

      calendarData = {
        type: 'month',
        year,
        month,
        monthData,
        monthlyStats: { monthlyPnl, tradingDays, totalTrades, avgWinRate },
        trades: sanitizedTrades
      };

      trade = {
        id: `calendar_month_${year}_${month}`,
        date: new Date(year, month, 1),
        isCalendarMonthShare: true
      };
    } else if (shareType === 'calendar-year' && year) {
      // Handle calendar year sharing
      const params = new URLSearchParams({
        year: year.toString()
      });

      const yearResponse = await fetch(`${process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/year-daily?${params}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      if (!yearResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch calendar year data' },
          { status: 500 }
        );
      }

      const yearDataResponse = await yearResponse.json();
      const yearData = yearDataResponse.dailyData || {};

      // Calculate year stats
      const totalPnl = Object.values(yearData).reduce((sum: number, d: any) => sum + (d?.pnl || 0), 0);
      const totalTrades = Object.values(yearData).reduce((sum: number, d: any) => sum + (d?.tradeCount || 0), 0);
      const tradingDays = Object.values(yearData).filter((d: any) => d && d.tradeCount > 0).length;
      const winDays = Object.values(yearData).filter((d: any) => d && d.pnl > 0).length;

      calendarData = {
        type: 'year',
        year,
        yearData,
        yearStats: { totalPnl, totalTrades, tradingDays, winDays }
      };

      trade = {
        id: `calendar_year_${year}`,
        date: new Date(year, 0, 1),
        isCalendarYearShare: true
      };
    } else if (shareType === 'statistics' && (dateFrom || dateTo)) {
      // Handle statistics sharing
      statisticsData = await fetchStatistics(user.id, dateFrom, dateTo);

      if (!statisticsData || statisticsData.stats.totalTrades === 0) {
        return NextResponse.json(
          { error: 'No trading data found for the specified date range' },
          { status: 404 }
        );
      }

      // Create a placeholder trade object for statistics sharing
      trade = {
        id: `stats_${dateFrom}_${dateTo}`,
        date: new Date(),
        isStatsShare: true
      };
    } else if (tradeId) {
      // Get specific trade by ID
      trade = await tradesRepo.getTradeById(user.id, tradeId);
      if (!trade) {
        return NextResponse.json(
          { error: 'Trade not found' },
          { status: 404 }
        );
      }
    } else if (date) {
      // Get all trades for the date (for records sharing)
      const recordsDate = new Date(date);
      const trades = await tradesRepo.getTradesForRecordsDate(user.id, recordsDate);

      if (!trades || trades.length === 0) {
        return NextResponse.json(
          { error: 'No trades found for the specified date' },
          { status: 404 }
        );
      }

      // For records sharing, create a combined trade object
      const summary = await tradesRepo.getRecordsSummary(
        user.id,
        new Date(recordsDate.setUTCHours(0, 0, 0, 0)),
        new Date(recordsDate.setUTCHours(23, 59, 59, 999))
      );

      trade = {
        id: `records_${date}`,
        date: recordsDate,
        symbol: 'MULTIPLE',
        side: 'LONG',
        quantity: summary.totalVolume,
        executions: trades.reduce((sum, t) => sum + (t.executions || 0), 0),
        pnl: summary.totalPnl,
        status: 'CLOSED',
        notes: trades.find(t => t.status === 'BLANK')?.notes || '',
        tags: [],
        commission: trades.reduce((sum, t) => sum + (Number(t.commission) || 0), 0),
        fees: trades.reduce((sum, t) => sum + (Number(t.fees) || 0), 0),
        marketSession: 'REGULAR',
        orderType: 'MARKET',
        totalTrades: summary.totalTrades,
        winRate: summary.winRate,
        trades: trades.filter(t => t.status !== 'BLANK'),
        isRecordsShare: true
      };

      // Get all orders for all trades in the record
      const allOrders = await Promise.all(
        trades.map(async (t) => {
          if (t.isCalculated && t.ordersInTrade && t.ordersInTrade.length > 0) {
            return await ordersRepo.getOrdersByIds(t.ordersInTrade);
          }
          return [];
        })
      );

      orders = allOrders.flat().filter(order => order.symbol);
    }

    // Validate that we have a trade, statistics, or calendar data to share
    if (!trade && !statisticsData && !calendarData) {
      return NextResponse.json(
        { error: 'No data found to share' },
        { status: 404 }
      );
    }

    // Get orders for single trade if not records share
    if (tradeId && trade.isCalculated && trade.ordersInTrade && trade.ordersInTrade.length > 0) {
      orders = await ordersRepo.getOrdersByIds(trade.ordersInTrade);
      // Filter to only matching symbols
      orders = orders.filter(order => order.symbol === trade.symbol);
    }

    // Generate unique share key
    let shareKey: string = '';
    let keyExists = true;
    let attempts = 0;
    
    while (keyExists && attempts < 10) {
      shareKey = generateShareKey();
      const existing = await prisma.sharedTrade.findUnique({
        where: { shareKey }
      });
      keyExists = !!existing;
      attempts++;
    }
    
    if (keyExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique share key. Please try again.' },
        { status: 500 }
      );
    }

    // Create expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Sanitize data for sharing based on share type
    let sanitizedTrade: any;
    let sanitizedOrders: any[];
    let metadata: any;

    if (shareType === 'calendar-month' && calendarData) {
      // For calendar month sharing, store the calendar data
      sanitizedTrade = calendarData;
      sanitizedOrders = [];
      metadata = {
        isCalendarMonthShare: true,
        year,
        month,
        createdBy: user.email
      };
    } else if (shareType === 'calendar-year' && calendarData) {
      // For calendar year sharing, store the calendar data
      sanitizedTrade = calendarData;
      sanitizedOrders = [];
      metadata = {
        isCalendarYearShare: true,
        year,
        createdBy: user.email
      };
    } else if (shareType === 'statistics' && statisticsData) {
      // For statistics sharing, store the statistics data
      sanitizedTrade = statisticsData.stats;
      sanitizedOrders = statisticsData.winLossStats ? [statisticsData.winLossStats] : [];
      metadata = {
        isStatsShare: true,
        dateFrom,
        dateTo,
        createdBy: user.email
      };
    } else {
      // For record/trade sharing
      sanitizedTrade = sanitizeTradeData(trade);
      sanitizedOrders = sanitizeOrderData(orders);
      metadata = {
        originalTradeId: tradeId,
        shareDate: date,
        isRecordsShare: !!date,
        createdBy: user.email
      };
    }

    // Create shared trade record
    const sharedTrade = await prisma.sharedTrade.create({
      data: {
        shareKey: shareKey,
        userId: user.id,
        tradeSnapshot: sanitizedTrade,
        orderSnapshot: sanitizedOrders,
        metadata,
        expiresAt
      }
    });

    // Generate share URL based on type
    const baseUrl = process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const shareUrl = shareType === 'statistics'
      ? `${baseUrl}/share/stats/${shareKey}`
      : shareType === 'calendar-month'
        ? `${baseUrl}/share/calendar-month/${shareKey}`
        : shareType === 'calendar-year'
          ? `${baseUrl}/share/calendar-year/${shareKey}`
          : `${baseUrl}/share/record/${shareKey}`;

    return NextResponse.json({
      shareKey,
      shareUrl,
      expiresAt,
      success: true
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create share',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}