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
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  // Track window width for responsive grid
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="flex items-center justify-center mb-2">
        <div className="flex items-center space-x-6 bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-theme-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevYear}
            aria-label="Previous year"
            className="h-10 w-10 rounded-full hover:bg-theme-tertiary/10 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ChevronLeft className="h-5 w-5 text-theme-secondary" />
          </Button>
          <span className="text-3xl font-bold text-theme-primary-text tracking-tight bg-gradient-to-r from-theme-primary-text to-theme-secondary bg-clip-text">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextYear}
            aria-label="Next year"
            className="h-10 w-10 rounded-full hover:bg-theme-tertiary/10 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ChevronRight className="h-5 w-5 text-theme-secondary" />
          </Button>
        </div>
      </div>

      {/* Months Grid - Responsive layout: 1 col mobile, 2 cols at md-1300px, 3 cols above 1300px */}
      <div 
        className="grid gap-6"
        style={{
          gridTemplateColumns: 
            windowWidth < 768 ? 'repeat(1, minmax(0, 1fr))' :
            windowWidth > 1300 ? 'repeat(3, minmax(0, 1fr))' :
            'repeat(2, minmax(0, 1fr))'
        }}
      >
        {monthNames.map((monthName, monthIndex) => (
          <Card 
            key={monthIndex}
            className="bg-theme-surface border-theme-border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl backdrop-blur-sm relative overflow-hidden group"
          >
            <CardHeader className="pb-3 bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/80 border-b border-theme-border/50 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="font-bold text-lg text-theme-primary-text tracking-tight">{monthName} <span className="font-normal text-theme-secondary-text text-sm">{year}</span></h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthOpen(monthIndex)}
                  className="h-8 px-3 text-xs border-theme-border/60 hover:bg-gradient-to-r hover:from-theme-surface hover:to-theme-surface/80 hover:border-theme-tertiary/40 text-theme-primary-text hover:text-theme-tertiary transition-all duration-200 hover:scale-105 rounded-xl shadow-sm hover:shadow-md"
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
              <div className="grid grid-cols-7 gap-1">
                {generateMonthCalendar(monthIndex).map((day, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center text-xs p-1 relative rounded-lg
                      ${!day ? 'invisible' : `${getDayBackground(day)} ${dayHasTradeData(day) ? 'cursor-pointer hover:opacity-80 hover:scale-110 hover:z-10 hover:shadow-lg' : 'cursor-default hover:bg-theme-surface/80'} transition-all duration-200 border border-theme-border/30`}
                      ${day && dayHasTradeData(day) ? 'shadow-sm hover:shadow-md' : ''}
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
                      <span className={`font-semibold ${getDayColor(day)} transition-all duration-200`}>
                        {day.date}
                      </span>
                    )}
                    {day && dayHasTradeData(day as Record<string, unknown>) ? (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-theme-tertiary opacity-60 animate-pulse"></div>
                    ) : null}
                  </div>
                ))}
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
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total P&L</div>
              <div className={`text-3xl font-bold mb-1 ${
                Object.values(yearData).reduce((sum, d) => sum + (d?.pnl || 0), 0) >= 0 
                  ? 'text-theme-green' 
                  : 'text-theme-red'
              }`}>
                ${Number(Object.values(yearData).reduce((sum, d) => sum + (d?.pnl || 0), 0)).toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total Trades</div>
              <div className="text-3xl font-bold text-theme-primary-text mb-1">
                {Number(Object.values(yearData).reduce((sum, d) => sum + (d?.tradeCount || 0), 0))}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Trading Days</div>
              <div className="text-3xl font-bold text-theme-primary-text mb-1">
                {Object.values(yearData).filter(d => d && d.tradeCount > 0).length}
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Win Days</div>
              <div className="text-3xl font-bold text-theme-green mb-1">
                {Object.values(yearData).filter(d => d && d.pnl > 0).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}