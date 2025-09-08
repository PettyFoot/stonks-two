'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, getDay, startOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

interface DayData {
  tradeCount: number;
  pnl: number;
  winRate: number;
}

interface CalendarYearViewProps {
  year: number;
  isDemo?: boolean;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarYearView({ year: initialYear, isDemo = false }: CalendarYearViewProps) {
  const router = useRouter();
  const { filters } = useGlobalFilters();
  const [year, setYear] = useState(initialYear);
  const [yearData, setYearData] = useState<Record<string, DayData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  const fetchYearData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        // Add filter parameters
        ...(filters.symbol && { symbols: [filters.symbol].join(',') }),
        ...(filters.side && filters.side !== 'all' && { sides: [filters.side].join(',') }),
        ...(filters.tags?.length && { tags: filters.tags.join(',') }),
        ...(filters.customDateRange?.from && { dateFrom: filters.customDateRange.from }),
        ...(filters.customDateRange?.to && { dateTo: filters.customDateRange.to }),
      });
      if (isDemo) {
        params.append('demo', 'true');
      }
      const response = await fetch(`/api/calendar/year-daily?${params}`);
      if (response.ok) {
        const data = await response.json();
        setYearData(data.dailyData || {});
      }
    } catch (error) {
      console.error('Error fetching year data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [year, filters, isDemo]);

  useEffect(() => {
    fetchYearData();
  }, [fetchYearData]);

  const handlePrevYear = () => setYear(prev => prev - 1);
  const handleNextYear = () => setYear(prev => prev + 1);

  const handleMonthOpen = (month: number) => {
    // Navigate to calendar page with month view
    // Set the date to the first day of the selected month
    const date = new Date(year, month, 1);
    router.push(`/calendar?view=month&date=${date.toISOString()}`);
  };

  const handleDayClick = (dateStr: string) => {
    // Navigate to calendar page with month view focused on the selected date
    const date = new Date(dateStr);
    router.push(`/calendar?view=month&date=${date.toISOString()}`);
  };

  const dayHasTradeData = (day: Record<string, unknown>) => {
    return day && day.hasData && Number(day.tradeCount || 0) > 0;
  };


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
    if (pnl > 0) return 'bg-theme-green hover:bg-theme-green/80';
    if (pnl < 0) return 'bg-theme-red hover:bg-theme-red/80';
    return 'bg-theme-surface';
  };

  const getMonthlyPnL = (monthIndex: number) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0); // Last day of month
    
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading year view...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Year Navigation - Centered */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevYear}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-2xl font-bold text-theme-primary-text">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextYear}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Months Grid - 3x4 layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {monthNames.map((monthName, monthIndex) => (
          <Card 
            key={monthIndex}
            className="bg-theme-surface border-theme-border shadow-sm"
          >
            <CardHeader className="pb-2 bg-theme-surface border-b border-theme-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-theme-primary-text">{monthName}, {year}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthOpen(monthIndex)}
                  className="h-7 px-2 text-xs border-theme-border hover:bg-theme-surface/50 text-theme-primary-text"
                >
                  Open
                </Button>
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

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {generateMonthCalendar(monthIndex).map((day, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center text-xs p-1
                      ${!day ? 'invisible' : `${getDayBackground(day)} ${dayHasTradeData(day) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-colors border border-theme-border`}
                    `}
                    onClick={() => day && dayHasTradeData(day as Record<string, unknown>) && handleDayClick(day.dateStr)}
                    role={day && dayHasTradeData(day as Record<string, unknown>) ? "button" : undefined}
                    tabIndex={day && dayHasTradeData(day as Record<string, unknown>) ? 0 : undefined}
                    aria-label={day && dayHasTradeData(day as Record<string, unknown>) ? `${day.date} - ${day.tradeCount} trades, $${Number(day.pnl || 0).toFixed(2)} P&L` : undefined}
                    onKeyDown={(e) => {
                      if (day && dayHasTradeData(day as Record<string, unknown>) && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleDayClick(day.dateStr);
                      }
                    }}
                  >
                    {day && (
                      <span className={`font-medium ${getDayColor(day)}`}>
                        {day.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Monthly PnL Total */}
              <div className="mt-3 pt-2 border-t border-theme-border">
                <div className="flex items-center justify-center">
                  <div className={`text-sm font-bold ${
                    getMonthlyPnL(monthIndex) >= 0 
                      ? 'text-theme-green' 
                      : 'text-theme-red'
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
      <Card className="bg-theme-surface border-theme-border shadow-sm">
        <CardContent className="p-6 bg-theme-surface">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-theme-secondary-text">Total P&L</div>
              <div className={`text-2xl font-bold ${
                Object.values(yearData).reduce((sum, d) => sum + (d?.pnl || 0), 0) >= 0 
                  ? 'text-theme-green' 
                  : 'text-theme-red'
              }`}>
                ${Number(Object.values(yearData).reduce((sum, d) => sum + (d?.pnl || 0), 0)).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-theme-secondary-text">Total Trades</div>
              <div className="text-2xl font-bold text-theme-primary-text">
                {Number(Object.values(yearData).reduce((sum, d) => sum + (d?.tradeCount || 0), 0))}
              </div>
            </div>
            <div>
              <div className="text-sm text-theme-secondary-text">Trading Days</div>
              <div className="text-2xl font-bold text-theme-primary-text">
                {Object.values(yearData).filter(d => d && d.tradeCount > 0).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-theme-secondary-text">Win Days</div>
              <div className="text-2xl font-bold text-theme-green">
                {Object.values(yearData).filter(d => d && d.pnl > 0).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}