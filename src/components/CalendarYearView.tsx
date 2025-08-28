'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, getDay, startOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';

interface DayData {
  tradeCount: number;
  pnl: number;
  winRate: number;
}

interface CalendarYearViewProps {
  year: number;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarYearView({ year: initialYear }: CalendarYearViewProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [yearData, setYearData] = useState<Record<string, DayData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  const fetchYearData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/year-daily?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setYearData(data.dailyData || {});
      }
    } catch (error) {
      console.error('Error fetching year data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [year]);

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
    // Navigate to records page with the selected date
    router.push(`/records?date=${dateStr}`);
  };

  const dayHasTradeData = (dayData: any) => {
    return dayData && dayData.tradeCount > 0;
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
        ...dayData
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

  const getDayColor = (dayData: DayData | undefined) => {
    if (!dayData || !dayData.tradeCount) return 'text-theme-secondary-text';
    const pnl = Number(dayData.pnl || 0);
    if (pnl > 0) return 'text-white font-bold';
    if (pnl < 0) return 'text-white font-bold';
    return 'text-theme-secondary-text';
  };

  const getDayBackground = (dayData: DayData | undefined) => {
    if (!dayData || !dayData.tradeCount) return 'bg-white';
    const pnl = Number(dayData.pnl || 0);
    if (pnl > 0) return 'bg-theme-green hover:bg-theme-green/80';
    if (pnl < 0) return 'bg-theme-red hover:bg-theme-red/80';
    return 'bg-theme-surface';
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
              <div className="grid grid-cols-7 gap-1 mb-2">
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
                      aspect-square flex items-center justify-center text-xs p-1
                      ${!day ? 'bg-theme-border' : `${getDayBackground(day)} ${dayHasTradeData(day) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-colors border border-theme-border`}
                    `}
                    onClick={() => day && dayHasTradeData(day) && handleDayClick(day.dateStr)}
                    role={dayHasTradeData(day) ? "button" : undefined}
                    tabIndex={dayHasTradeData(day) ? 0 : undefined}
                    aria-label={day && dayHasTradeData(day) ? `${day.date} - ${day.tradeCount} trades, $${Number(day.pnl || 0).toFixed(2)} P&L` : undefined}
                    onKeyDown={(e) => {
                      if (day && dayHasTradeData(day) && (e.key === 'Enter' || e.key === ' ')) {
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