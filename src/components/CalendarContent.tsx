'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, getDaysInMonth, getDay } from 'date-fns';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import CalendarSummaryChartsRecharts from '@/components/CalendarSummaryChartsRecharts';
import CalendarYearView from '@/components/CalendarYearView';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import { Trade, ColumnConfiguration } from '@/types';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';
import ShareButton from '@/components/ShareButton';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';

type ViewType = 'summary' | 'year' | 'month';

interface DayData {
  day: string;
  tradeCount: number;
  pnl: number;
  wins: number;
  winRate: number;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarContent = React.memo(() => {
  const { user, isLoading: authLoading, isDemo } = useAuth();
  const { setCustomDateRange } = useGlobalFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize state
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setIsLoading] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfiguration[]>([]);

  const handleColumnsChange = (newColumns: ColumnConfiguration[]) => {
    setColumnConfig(newColumns);
  };

  // Handle URL parameter changes
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view') as ViewType;
    
    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        setCurrentDate(startOfMonth(date));
        if (viewParam) {
          setView(viewParam);
        }
        // Clear selected day when navigating to a new month
        setSelectedDay(null);
      }
    }
  }, [searchParams]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 0-indexed to 1-indexed

  // Fetch month data
  const fetchMonthData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Calculate the calendar grid date range (including prev/next month edge days)
      const firstDay = startOfMonth(currentDate);
      const startingDayOfWeek = getDay(firstDay);
      const daysInMonth = getDaysInMonth(currentDate);

      // Calculate first day of calendar grid (may be in previous month)
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const daysInPrevMonth = getDaysInMonth(new Date(prevYear, prevMonth - 1));
      const firstGridDay = daysInPrevMonth - startingDayOfWeek + 1;
      const gridStartDate = format(new Date(prevYear, prevMonth - 1, firstGridDay), 'yyyy-MM-dd');

      // Calculate last day of calendar grid (may be in next month)
      const totalDaysInGrid = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
      const daysFromNextMonth = totalDaysInGrid - (startingDayOfWeek + daysInMonth);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const gridEndDate = format(new Date(nextYear, nextMonth - 1, daysFromNextMonth), 'yyyy-MM-dd');

      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        startDate: gridStartDate,
        endDate: gridEndDate
      });
      if (isDemo) {
        params.append('demo', 'true');
      }
      const response = await fetch(`/api/calendar/month?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMonthData(data);
      }
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, year, month, isDemo, currentDate]);

  // Fetch trades
  const fetchTrades = useCallback(async () => {
    if (!user) return;
    
    // Create date range for the selected month or day
    let dateFrom: Date;
    let dateTo: Date;
    
    if (selectedDay) {
      // If a specific day is selected, get trades for just that day
      dateFrom = new Date(selectedDay);
      dateTo = new Date(selectedDay);
      dateTo.setHours(23, 59, 59, 999);
    } else {
      // Otherwise get trades for the entire month
      dateFrom = new Date(year, month - 1, 1); // First day of month
      dateTo = new Date(year, month, 0); // Last day of month
      dateTo.setHours(23, 59, 59, 999);
    }
    
    const params = new URLSearchParams({
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0]
    });
    if (isDemo) {
      params.append('demo', 'true');
    }

    try {
      const response = await fetch(`/api/trades?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  }, [user, year, month, selectedDay, isDemo]);

  useEffect(() => {
    if (view === 'month') {
      fetchMonthData();
      fetchTrades();
    }
  }, [view, currentDate, selectedDay, fetchMonthData, fetchTrades]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
    setSelectedDay(null);
  };

  // Helper function to check if a day has trade data
  const dayHasTradeData = (dayStr: string): boolean => {
    const dayData = monthData.find(d => d.day === dayStr);
    return dayData ? (dayData.tradeCount || 0) > 0 : false;
  };

  // Handle day click with conditional navigation
  const handleDayClick = (dayStr: string) => {
    if (dayHasTradeData(dayStr)) {
      // Set global filter to the selected date (from dayStr to next day)
      const selectedDate = new Date(dayStr);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const toDayStr = nextDay.toISOString().split('T')[0];
      
      setCustomDateRange(dayStr, toDayStr);
      router.push('/trades');
    } else {
      // Just update the selected day for display purposes
      setSelectedDay(dayStr);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'month') return;
      
      if (e.key === 'ArrowLeft' && e.ctrlKey) {
        handlePrevMonth();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        handleNextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  // Type guard functions
  const isWeekTotal = (item: unknown): item is { weekPnl: number; weekTrades: number; weekWinRate: number; isWeekTotal: boolean; weekNumber: number } => {
    return Boolean(item && typeof item === 'object' && item !== null && (item as Record<string, unknown>).isWeekTotal === true);
  };

  const isDayData = (item: unknown): item is { date: number; dayStr: string; isPrevMonth?: boolean; isNextMonth?: boolean; pnl: number; tradeCount: number; winRate: number } => {
    return Boolean(item && typeof item === 'object' && item !== null && (item as Record<string, unknown>).isWeekTotal !== true);
  };

  // Generate calendar grid
  // Calculate weekly totals for a week (7 days)
  const calculateWeeklyTotal = (weekDays: Array<Record<string, unknown>>) => {
    const validDays = weekDays.filter(day => day && day.pnl !== undefined);
    const weekPnl = validDays.reduce((sum, d) => sum + Number(d.pnl || 0), 0);
    const weekTrades = validDays.reduce((sum, d) => sum + Number(d.tradeCount || 0), 0);
    const weekWins = validDays.reduce((sum, d) => sum + Number(d.wins || 0), 0);

    return {
      weekPnl,
      weekTrades,
      weekWinRate: weekTrades > 0 ? Math.round((weekWins / weekTrades) * 100) : 0,
      isWeekTotal: true,
      weekNumber: 0 // Will be set by caller
    };
  };

  const generateCalendarDays = () => {
    const firstDay = startOfMonth(currentDate);
    const startingDayOfWeek = getDay(firstDay);
    const daysInMonth = getDaysInMonth(currentDate);
    const calendarDays = [];

    // Add previous month days (grayed out)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(new Date(prevYear, prevMonth - 1));

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const dayStr = format(new Date(prevYear, prevMonth - 1, prevDay), 'yyyy-MM-dd');
      const dayData = monthData.find(d => d.day === dayStr);
      calendarDays.push({
        date: prevDay,
        dayStr,
        isPrevMonth: true,
        pnl: dayData?.pnl || 0,
        tradeCount: dayData?.tradeCount || 0,
        wins: dayData?.wins || 0,
        winRate: dayData?.winRate || 0
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
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
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    let nextMonthDay = 1;
    while (calendarDays.length < totalCellsNeeded) {
      const dayStr = format(new Date(nextYear, nextMonth - 1, nextMonthDay), 'yyyy-MM-dd');
      const dayData = monthData.find(d => d.day === dayStr);
      calendarDays.push({
        date: nextMonthDay,
        dayStr,
        isNextMonth: true,
        pnl: dayData?.pnl || 0,
        tradeCount: dayData?.tradeCount || 0,
        wins: dayData?.wins || 0,
        winRate: dayData?.winRate || 0
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

  // Calculate summary stats
  const summaryStats = {
    monthlyPnl: monthData.reduce((sum, d) => sum + (Number(d.pnl) || 0), 0),
    tradingDays: monthData.filter(d => d.tradeCount > 0).length,
    totalTrades: monthData.reduce((sum, d) => sum + (Number(d.tradeCount) || 0), 0),
    avgWinRate: monthData.length > 0 
      ? Math.round(monthData.reduce((sum, d) => sum + (Number(d.winRate) || 0), 0) / monthData.length)
      : 0
  };

  if (authLoading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader />
      </div>
    );
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">Please log in to view calendar</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Calendar" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel showAdvanced={true} />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Tab Navigation with Share Button */}
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>

            {/* Share Button - shown for Month and Year views */}
            {view === 'month' && (
              <ShareButton
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                shareType="calendar-month"
                variant="button"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              />
            )}
            {view === 'year' && (
              <ShareButton
                year={year}
                shareType="calendar-year"
                variant="button"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              />
            )}
          </div>

          {/* Summary View */}
          <TabsContent value="summary">
            <CalendarSummaryChartsRecharts isDemo={isDemo} />
          </TabsContent>

          {/* Year View */}
          <TabsContent value="year">
            <CalendarYearView year={year} isDemo={isDemo} />
          </TabsContent>

          {/* Month View */}
          <TabsContent value="month">
            {/* Modern Calendar Header */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-6 bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-theme-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="h-10 w-10 rounded-full hover:bg-theme-tertiary/10 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="h-5 w-5 text-theme-secondary" />
                </Button>
                <div className="text-center min-w-[250px]">
                  <h1 className="text-3xl font-bold text-theme-primary-text tracking-tight bg-gradient-to-r from-theme-primary-text to-theme-secondary bg-clip-text">
                    {format(currentDate, 'MMMM')}
                  </h1>
                  <div className="text-xl font-normal text-theme-secondary-text mt-1">
                    {format(currentDate, 'yyyy')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="h-10 w-10 rounded-full hover:bg-theme-tertiary/10 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ChevronRight className="h-5 w-5 text-theme-secondary" />
                </Button>
              </div>
            </div>

            {/* Monthly P&L Summary */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/95 border border-theme-border/50 rounded-2xl px-6 py-3 shadow-lg">
                <div className="text-center">
                  <div className="text-sm font-medium text-theme-secondary-text uppercase tracking-wide mb-1">Monthly P&L</div>
                  <div className={`text-2xl font-bold ${summaryStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                    ${summaryStats.monthlyPnl.toFixed(2)}
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
                          className="hidden lg:flex md:min-h-[120px] lg:min-h-[140px] border border-theme-border/30 rounded-2xl p-4 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm text-center flex-col justify-center shadow-lg hover:scale-105 transition-all duration-300 relative"
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
                      // Regular day cell
                      return (
                        <button
                          key={index}
                          onClick={() => day && handleDayClick(day.dayStr)}
                          disabled={!day || !dayHasTradeData(day.dayStr)}
                          className={`
                            min-h-[80px] md:min-h-[120px] lg:min-h-[140px] border border-theme-border/30 rounded-lg md:rounded-2xl p-2 lg:p-3 text-left transition-all duration-300 relative shadow-sm
                            ${!day ? 'bg-theme-surface/20 cursor-default' :
                              day && dayHasTradeData(day.dayStr) ?
                                Number(day.pnl || 0) > 0 ? 'bg-theme-green hover:bg-theme-green/80 cursor-pointer text-white hover:scale-110 hover:shadow-xl hover:z-10 hover:-translate-y-2' :
                                Number(day.pnl || 0) < 0 ? 'bg-theme-red hover:bg-theme-red/80 cursor-pointer text-white hover:scale-110 hover:shadow-xl hover:z-10 hover:-translate-y-2' :
                                'bg-white hover:bg-theme-surface/50 cursor-pointer hover:scale-110 hover:shadow-xl hover:-translate-y-2' :
                              day.isPrevMonth || day.isNextMonth ?
                                'bg-theme-surface/10 cursor-default opacity-50 hover:opacity-60' :
                                'bg-white hover:bg-theme-surface/30 cursor-default hover:scale-105 hover:-translate-y-1'
                            }
                            ${selectedDay === day?.dayStr ? 'ring-2 ring-theme-tertiary shadow-lg scale-105' : ''}
                            focus:outline-none focus:ring-2 focus:ring-theme-tertiary
                          `}
                          aria-label={day ? `${day.date} - ${day.tradeCount || 0} trades${dayHasTradeData(day.dayStr) ? ' (clickable)' : ''}` : undefined}
                        >
                          {day && (
                            <div className="h-full flex flex-col relative">
                              {/* Date number - centered on mobile, top-left on larger screens */}
                              <div className="md:absolute md:top-0 md:left-0 flex md:block justify-center md:justify-start">
                                <div className={`text-lg font-bold ${dayHasTradeData(day.dayStr) ? 'text-white' : day.isPrevMonth || day.isNextMonth ? 'text-theme-secondary-text opacity-75' : 'text-theme-primary-text'} transition-all duration-200`}>
                                  {day.date}
                                </div>
                              </div>

                              {/* Trading indicator dot */}
                              {day && dayHasTradeData(day.dayStr) && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-theme-tertiary opacity-70 animate-pulse shadow-sm"></div>
                              )}

                              {/* Trade statistics - centered in the cell, visible on tablet and larger screens */}
                              <div className="hidden md:flex flex-col flex-1 justify-center items-center space-y-1">
                                {day && dayHasTradeData(day.dayStr) && (
                                  <>
                                    {/* PnL */}
                                    <div className={`text-sm font-bold text-center transition-all duration-200 ${dayHasTradeData(day.dayStr) ? 'text-white' : 'text-theme-primary-text'}`}>
                                      ${Number(day.pnl || 0).toFixed(2)}
                                    </div>
                                    
                                    {/* Trade count */}
                                    <div className={`text-xs text-center transition-all duration-200 ${dayHasTradeData(day.dayStr) ? 'text-white/90' : 'text-theme-secondary-text'}`}>
                                      {day.tradeCount || 0} trade{(day.tradeCount || 0) !== 1 ? 's' : ''}
                                    </div>
                                    
                                    {/* Win rate - only show if there are trades */}
                                    {(day.tradeCount || 0) > 0 && (
                                      <div className={`text-xs text-center transition-all duration-200 ${dayHasTradeData(day.dayStr) ? 'text-white/90' : 'text-theme-secondary-text'}`}>
                                        {Math.round(day.winRate || 0)}% win
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    } else {
                      return null;
                    }
                  })}
            </div>
          </CardContent>
        </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Monthly P&L</div>
                  <div className={`text-2xl font-bold ${summaryStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                    ${summaryStats.monthlyPnl.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Trading Days</div>
                  <div className="text-2xl font-bold text-theme-primary-text">{summaryStats.tradingDays}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Total Trades</div>
                  <div className="text-2xl font-bold text-theme-primary-text">{summaryStats.totalTrades}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-theme-border/20 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className="text-xs font-medium text-theme-secondary-text uppercase tracking-wide mb-2">Avg Win Rate</div>
                  <div className="text-2xl font-bold text-theme-primary-text">{summaryStats.avgWinRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Trades Table */}
            <div className="mt-8">
              <Card className="bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface/95 border-theme-border shadow-xl rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-theme-tertiary/5 via-transparent to-theme-tertiary/5 opacity-30"></div>
                <CardHeader className="bg-gradient-to-r from-theme-surface via-theme-surface to-theme-surface/80 border-b border-theme-border/50 relative z-10 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold text-theme-primary-text">
                    {selectedDay
                      ? `Trades for ${format(new Date(selectedDay), 'MMMM d, yyyy')}`
                      : `All Trades for ${format(currentDate, 'MMMM yyyy')}`
                    }
                  </CardTitle>
                  <ColumnSettingsModal onColumnsChange={handleColumnsChange} />
                </CardHeader>
                <CardContent className="relative z-10">
                  <TradesTable
                    trades={trades}
                    showCheckboxes={false}
                    columnConfig={columnConfig}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

CalendarContent.displayName = 'CalendarContent';

export default CalendarContent;