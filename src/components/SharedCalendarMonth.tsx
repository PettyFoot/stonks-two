'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, getDaysInMonth, getDay, startOfMonth } from 'date-fns';
import TradesTable from '@/components/TradesTable';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';
import { Trade, ColumnConfiguration } from '@/types';

interface DayData {
  day: string;
  tradeCount: number;
  pnl: number;
  winRate: number;
}

interface MonthlyStats {
  monthlyPnl: number;
  tradingDays: number;
  totalTrades: number;
  avgWinRate: number;
}

interface SharedCalendarMonthProps {
  year: number;
  month: number; // 0-indexed
  monthData: DayData[];
  monthlyStats: MonthlyStats;
  trades: Trade[];
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SharedCalendarMonth({ year, month, monthData, monthlyStats, trades }: SharedCalendarMonthProps) {
  const currentDate = new Date(year, month, 1);
  const [columnConfig, setColumnConfig] = useState<ColumnConfiguration[]>([]);

  const handleColumnsChange = (newColumns: ColumnConfiguration[]) => {
    setColumnConfig(newColumns);
  };

  // Type guard functions
  const isWeekTotal = (item: unknown): item is { weekPnl: number; weekTrades: number; weekWinRate: number; isWeekTotal: boolean; weekNumber: number } => {
    return Boolean(item && typeof item === 'object' && item !== null && (item as Record<string, unknown>).isWeekTotal === true);
  };

  const isDayData = (item: unknown): item is { date: number; dayStr: string; isPrevMonth?: boolean; isNextMonth?: boolean; pnl: number; tradeCount: number; winRate: number } => {
    return Boolean(item && typeof item === 'object' && item !== null && (item as Record<string, unknown>).isWeekTotal !== true);
  };

  // Calculate weekly totals for a week (7 days)
  const calculateWeeklyTotal = (weekDays: Array<Record<string, unknown>>) => {
    const validDays = weekDays.filter(day => day && day.pnl !== undefined);
    const weekPnl = validDays.reduce((sum, d) => sum + Number(d.pnl || 0), 0);
    const weekTrades = validDays.reduce((sum, d) => sum + Number(d.tradeCount || 0), 0);
    const winDays = validDays.filter(d => Number(d.pnl) > 0).length;
    const tradingDays = validDays.filter(d => Number(d.tradeCount || 0) > 0).length;

    return {
      weekPnl,
      weekTrades,
      weekWinRate: tradingDays > 0 ? Math.round((winDays / tradingDays) * 100) : 0,
      isWeekTotal: true,
      weekNumber: 0
    };
  };

  const generateCalendarDays = () => {
    const firstDay = startOfMonth(currentDate);
    const startingDayOfWeek = getDay(firstDay);
    const daysInMonth = getDaysInMonth(currentDate);
    const calendarDays = [];

    // Add previous month days (grayed out)
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(new Date(prevYear, prevMonth));

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const dayStr = format(new Date(prevYear, prevMonth, prevDay), 'yyyy-MM-dd');
      calendarDays.push({
        date: prevDay,
        dayStr,
        isPrevMonth: true,
        pnl: 0,
        tradeCount: 0,
        winRate: 0
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = format(new Date(year, month, day), 'yyyy-MM-dd');
      const dayData = monthData.find(d => d.day === dayStr);
      calendarDays.push({
        date: day,
        dayStr,
        isPrevMonth: false,
        isNextMonth: false,
        ...dayData
      });
    }

    // Add next month days to complete the grid (grayed out)
    const totalCellsNeeded = Math.ceil(calendarDays.length / 7) * 7;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    let nextMonthDay = 1;
    while (calendarDays.length < totalCellsNeeded) {
      const dayStr = format(new Date(nextYear, nextMonth, nextMonthDay), 'yyyy-MM-dd');
      calendarDays.push({
        date: nextMonthDay,
        dayStr,
        isNextMonth: true,
        pnl: 0,
        tradeCount: 0,
        winRate: 0
      });
      nextMonthDay++;
    }

    // Add weekly totals at the end of each row
    const calendarWithWeekTotals = [];
    let weekNumber = 1;

    for (let i = 0; i < calendarDays.length; i += 7) {
      const weekDays = calendarDays.slice(i, i + 7);
      calendarWithWeekTotals.push(...weekDays);

      // Calculate and add weekly total for this row
      const weekTotal = calculateWeeklyTotal(weekDays);
      weekTotal.weekNumber = weekNumber;
      calendarWithWeekTotals.push(weekTotal);
      weekNumber++;
    }

    return calendarWithWeekTotals;
  };

  const dayHasTradeData = (dayStr: string): boolean => {
    const dayData = monthData.find(d => d.day === dayStr);
    return dayData ? (dayData.tradeCount || 0) > 0 : false;
  };

  return (
    <div className="space-y-6">
      {/* Monthly P&L Summary */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/95 border border-theme-border/50 rounded-2xl px-6 py-3 shadow-lg">
          <div className="text-center">
            <div className="text-sm font-medium text-theme-secondary-text uppercase tracking-wide mb-1">Monthly P&L</div>
            <div className={`text-2xl font-bold ${monthlyStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
              ${monthlyStats.monthlyPnl.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface/95 border-theme-border shadow-xl rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-theme-tertiary/5 via-transparent to-theme-tertiary/5 opacity-30"></div>
        <CardHeader className="pb-4 bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/80 border-b border-theme-border/50 relative z-10">
          <CardTitle className="flex items-center text-xl text-theme-primary-text">
            <Calendar className="h-6 w-6 mr-3 text-theme-tertiary" />
            <span className="font-bold">{format(currentDate, 'MMMM')}</span>{' '}<span className="font-normal">{format(currentDate, 'yyyy')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 relative z-10">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 lg:grid-cols-8 gap-1 md:gap-2 mb-4">
            {daysOfWeek.map(day => (
              <div key={day} className="p-2 md:p-3 text-center text-xs font-bold text-theme-primary-text flex items-center justify-center min-h-[40px]">
                {day}
              </div>
            ))}
            <div className="hidden lg:block p-3 text-center text-sm font-bold text-theme-primary-text bg-gradient-to-b from-theme-surface to-theme-surface/80 rounded-lg shadow-sm border border-theme-border/30">
              Week Total
            </div>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 lg:grid-cols-8 gap-1 md:gap-2">
            {generateCalendarDays().map((day, index) => {
              if (isWeekTotal(day)) {
                // Weekly total cell - hidden on mobile
                return (
                  <div
                    key={index}
                    className="hidden lg:flex md:min-h-[120px] lg:min-h-[140px] border border-theme-border/30 rounded-2xl p-4 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm text-center flex-col justify-center shadow-lg relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-2xl"></div>
                    <div className="relative z-10">
                      <div className="text-sm font-bold mb-2 text-theme-primary-text">
                        Week {day.weekNumber}
                      </div>
                      <div className={`text-lg font-bold mb-2 px-2 py-1 rounded-full ${day.weekPnl >= 0 ? 'text-theme-green bg-theme-green/10' : 'text-theme-red bg-theme-red/10'} shadow-sm`}>
                        ${day.weekPnl.toFixed(2)}
                      </div>
                      {day.weekTrades > 0 && (
                        <>
                          <div className="text-xs text-theme-secondary-text mb-1">
                            {day.weekTrades} trade{day.weekTrades !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-theme-secondary-text">
                            {day.weekWinRate}% win
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              } else if (isDayData(day)) {
                // Regular day cell - NO CLICK functionality (read-only)
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[80px] md:min-h-[120px] lg:min-h-[140px] border border-theme-border/30 rounded-lg md:rounded-2xl p-2 lg:p-3 text-left transition-all duration-300 relative shadow-sm
                      ${!day ? 'bg-theme-surface/20' :
                        day.isPrevMonth || day.isNextMonth ?
                          'bg-theme-surface/10 opacity-50' :
                        day && dayHasTradeData(day.dayStr) ?
                          Number(day.pnl || 0) > 0 ? 'bg-theme-green text-white' :
                          Number(day.pnl || 0) < 0 ? 'bg-theme-red text-white' :
                          'bg-white' :
                          'bg-white'
                      }
                    `}
                  >
                    {day && (
                      <div className="h-full flex flex-col relative">
                        {/* Date number */}
                        <div className="md:absolute md:top-0 md:left-0 flex md:block justify-center md:justify-start">
                          <div className={`text-lg font-bold ${day.isPrevMonth || day.isNextMonth ? 'text-theme-secondary-text opacity-75' : dayHasTradeData(day.dayStr) ? 'text-white' : 'text-theme-primary-text'}`}>
                            {day.date}
                          </div>
                        </div>

                        {/* Trading indicator dot */}
                        {day && dayHasTradeData(day.dayStr) && !day.isPrevMonth && !day.isNextMonth && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-theme-tertiary opacity-70 animate-pulse shadow-sm"></div>
                        )}

                        {/* Trade statistics */}
                        <div className="hidden md:flex flex-col flex-1 justify-center items-center space-y-1">
                          {day && dayHasTradeData(day.dayStr) && !day.isPrevMonth && !day.isNextMonth && (
                            <>
                              <div className={`text-sm font-bold text-center ${dayHasTradeData(day.dayStr) ? 'text-white' : 'text-theme-primary-text'}`}>
                                ${Number(day.pnl || 0).toFixed(2)}
                              </div>
                              <div className={`text-xs text-center ${dayHasTradeData(day.dayStr) ? 'text-white/90' : 'text-theme-secondary-text'}`}>
                                {day.tradeCount || 0} trade{(day.tradeCount || 0) !== 1 ? 's' : ''}
                              </div>
                              {(day.tradeCount || 0) > 0 && (
                                <div className={`text-xs text-center ${dayHasTradeData(day.dayStr) ? 'text-white/90' : 'text-theme-secondary-text'}`}>
                                  {Math.round(day.winRate || 0)}% win
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Monthly P&L</div>
            <div className={`text-2xl font-bold ${monthlyStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
              ${monthlyStats.monthlyPnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Trading Days</div>
            <div className="text-2xl font-bold text-theme-primary-text">{monthlyStats.tradingDays}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total Trades</div>
            <div className="text-2xl font-bold text-theme-primary-text">{monthlyStats.totalTrades}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Avg Win Rate</div>
            <div className="text-2xl font-bold text-theme-primary-text">{monthlyStats.avgWinRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <div className="mt-8">
        <Card className="bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface/95 border-theme-border shadow-xl rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-theme-tertiary/5 via-transparent to-theme-tertiary/5 opacity-30"></div>
          <CardHeader className="bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/80 border-b border-theme-border/50 relative z-10 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-theme-primary-text">
              All Trades for {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <ColumnSettingsModal onColumnsChange={handleColumnsChange} />
          </CardHeader>
          <CardContent className="relative z-10">
            <TradesTable
              trades={trades}
              showCheckboxes={false}
              columnConfig={columnConfig}
              isSharedView={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
