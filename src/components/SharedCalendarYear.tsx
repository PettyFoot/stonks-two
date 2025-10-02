'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format, getDaysInMonth, getDay, startOfMonth } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayData {
  tradeCount: number;
  pnl: number;
  winRate: number;
}

interface YearStats {
  totalPnl: number;
  totalTrades: number;
  tradingDays: number;
  winDays: number;
}

interface SharedCalendarYearProps {
  year: number;
  yearData: Record<string, DayData>;
  yearStats: YearStats;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SharedCalendarYear({ year, yearData, yearStats }: SharedCalendarYearProps) {
  const generateMonthCalendar = (monthIndex: number) => {
    const firstDay = startOfMonth(new Date(year, monthIndex));
    const startingDayOfWeek = getDay(firstDay);
    const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
    const calendarDays = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(year, monthIndex, day), 'yyyy-MM-dd');
      const dayData = yearData[dateStr];
      calendarDays.push({
        date: day,
        dateStr,
        hasData: !!dayData,
        tradeCount: dayData?.tradeCount || 0,
        pnl: dayData?.pnl || 0,
        winRate: dayData?.winRate || 0
      });
    }

    // Fill remaining cells to make complete rows
    while (calendarDays.length % 7 !== 0) {
      calendarDays.push(null);
    }

    // Ensure we always have 6 rows (42 cells) for consistent height
    while (calendarDays.length < 42) {
      calendarDays.push(null);
    }

    return calendarDays;
  };

  const getDayColor = (day: Record<string, unknown>) => {
    if (!day || !day.hasData || !day.tradeCount) return 'text-theme-primary-text';
    const pnl = Number(day.pnl || 0);
    if (pnl > 0) return 'text-white font-bold';
    if (pnl < 0) return 'text-white font-bold';
    return 'text-theme-primary-text';
  };

  const getDayBackground = (day: Record<string, unknown>) => {
    if (!day || !day.hasData || !day.tradeCount) return 'bg-white';
    const pnl = Number(day.pnl || 0);
    if (pnl > 0) return 'bg-theme-green';
    if (pnl < 0) return 'bg-theme-red';
    return 'bg-theme-surface';
  };

  const getMonthlyPnL = (monthIndex: number) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    let monthlyTotal = 0;
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const dateStr = format(new Date(year, monthIndex, day), 'yyyy-MM-dd');
      const dayData = yearData[dateStr];
      if (dayData) {
        monthlyTotal += dayData.pnl || 0;
      }
    }

    return monthlyTotal;
  };

  const dayHasTradeData = (day: Record<string, unknown>) => {
    return day && day.hasData && Number(day.tradeCount || 0) > 0;
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Months Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monthNames.map((monthName, monthIndex) => (
          <Card
            key={monthIndex}
            className="bg-theme-surface border-theme-border shadow-lg rounded-2xl backdrop-blur-sm relative overflow-hidden"
          >
            <CardHeader className="pb-3 bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/80 border-b border-theme-border/50 relative">
              <div className="flex items-center justify-between relative z-10">
                <h3 className="font-bold text-lg text-theme-primary-text tracking-tight">
                  {monthName} <span className="font-normal text-theme-secondary-text text-sm">{year}</span>
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-3 bg-theme-surface">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-theme-secondary-text py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days - Read-only, NO CLICK */}
              <div className="grid grid-cols-7 gap-1">
                {generateMonthCalendar(monthIndex).map((day, index) => {
                  const pnl = day ? Number(day.pnl || 0) : 0;
                  const isPositive = pnl >= 0;
                  const pnlColor = isPositive ? 'text-green-600' : 'text-red-600';

                  return day && dayHasTradeData(day as Record<string, unknown>) ? (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            aspect-square flex items-center justify-center text-xs p-1 relative rounded-lg
                            ${getDayBackground(day)} transition-all duration-200 border border-theme-border/30 shadow-sm
                          `}
                        >
                          <span className={`font-semibold ${getDayColor(day)}`}>
                            {day.date}
                          </span>
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-theme-tertiary opacity-60 animate-pulse"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-700">
                        <span className={pnlColor}>
                          {isPositive ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                        {' '}({day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''})
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div
                      key={index}
                      className={`
                        aspect-square flex items-center justify-center text-xs p-1 relative rounded-lg
                        ${!day ? 'invisible' : `${getDayBackground(day)} transition-all duration-200 border border-theme-border/30`}
                      `}
                    >
                      {day && (
                        <span className={`font-semibold ${getDayColor(day)}`}>
                          {day.date}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Monthly PnL Total */}
              <div className="mt-4 pt-3 border-t border-theme-border/30 bg-gradient-to-r from-theme-surface/50 via-theme-surface to-theme-surface/50 rounded-lg -mx-1 px-3">
                <div className="flex items-center justify-center">
                  <div className={`text-base font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
                    getMonthlyPnL(monthIndex) >= 0
                      ? 'text-theme-green bg-theme-green/10 shadow-sm'
                      : 'text-theme-red bg-theme-red/10 shadow-sm'
                  }`}>
                    {getMonthlyPnL(monthIndex) >= 0 ? '+' : ''}${getMonthlyPnL(monthIndex).toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Year Summary */}
      <Card className="bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface/95 border-theme-border shadow-xl rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-theme-tertiary/5 via-transparent to-theme-tertiary/5 opacity-50"></div>
        <CardContent className="p-8 relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-theme-primary-text mb-2">{year} Summary</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-theme-tertiary to-theme-green mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total P&L</div>
              <div className={`text-3xl font-bold mb-1 ${
                yearStats.totalPnl >= 0
                  ? 'text-theme-green'
                  : 'text-theme-red'
              }`}>
                ${yearStats.totalPnl.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total Trades</div>
              <div className="text-3xl font-bold text-theme-primary-text mb-1">
                {yearStats.totalTrades}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Trading Days</div>
              <div className="text-3xl font-bold text-theme-primary-text mb-1">
                {yearStats.tradingDays}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Win Days</div>
              <div className="text-3xl font-bold text-theme-green mb-1">
                {yearStats.winDays}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}
