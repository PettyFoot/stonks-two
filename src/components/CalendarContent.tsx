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
import { useUser } from '@auth0/nextjs-auth0/client';
import { Trade } from '@/types';

type ViewType = 'summary' | 'year' | 'month';

interface DayData {
  day: string;
  tradeCount: number;
  pnl: number;
  winRate: number;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarContent() {
  const { user, isLoading: authLoading } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize state
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setIsLoading] = useState(false);

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
      const response = await fetch(`/api/calendar/month?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setMonthData(data);
      }
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, year, month]);

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

    try {
      const response = await fetch(`/api/trades?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  }, [user, year, month, selectedDay]);

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
      // Navigate to records page with the selected date
      router.push(`/records?date=${dayStr}`);
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

  // Generate calendar grid
  // Calculate weekly totals for a week (7 days)
  const calculateWeeklyTotal = (weekDays: any[]) => {
    const validDays = weekDays.filter(day => day && day.pnl !== undefined);
    const weekPnl = validDays.reduce((sum, d) => sum + Number(d.pnl || 0), 0);
    const weekTrades = validDays.reduce((sum, d) => sum + Number(d.tradeCount || 0), 0);
    const winDays = validDays.filter(d => Number(d.pnl) > 0).length;
    const tradingDays = validDays.filter(d => Number(d.tradeCount || 0) > 0).length;
    
    return {
      weekPnl,
      weekTrades,
      weekWinRate: tradingDays > 0 ? Math.round((winDays / tradingDays) * 100) : 0,
      isWeekTotal: true
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
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">Please log in to view calendar</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Calendar" 
        subtitle={view === 'month' ? format(currentDate, 'MMMM yyyy') : ''}
        showTimeRangeFilters={false}
      />
      
      <FilterPanel />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Tab Navigation */}
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>

          {/* Summary View */}
          <TabsContent value="summary">
            <CalendarSummaryChartsRecharts />
          </TabsContent>

          {/* Year View */}
          <TabsContent value="year">
            <CalendarYearView year={year} />
          </TabsContent>

          {/* Month View */}
          <TabsContent value="month">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-theme-primary-text">
                  {format(currentDate, 'MMMM yyyy')}
                </h1>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-lg font-semibold text-theme-secondary-text">
                Monthly P&L: <span className={`${summaryStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                  ${summaryStats.monthlyPnl >= 0 ? '+' : ''}{summaryStats.monthlyPnl.toFixed(2)}
                </span>
              </div>
            </div>

        {/* Calendar Grid */}
        <Card className="bg-theme-surface border-theme-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Trading Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Days of Week Header */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-theme-secondary-text">
                  {day}
                </div>
              ))}
              <div className="p-2 text-center text-sm font-medium text-theme-secondary-text">
                Total
              </div>
            </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-8 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    if (day && day.isWeekTotal) {
                      // Weekly total cell
                      return (
                        <div
                          key={index}
                          className="min-h-[100px] border border-theme-border rounded-lg p-2 bg-theme-surface/50 text-center flex flex-col justify-center"
                        >
                          <div className="text-sm font-bold mb-2 text-theme-primary-text">
                            Week {day.weekNumber}
                          </div>
                          <div className={`text-sm font-bold mb-1 ${day.weekPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                            ${day.weekPnl >= 0 ? '+' : ''}{day.weekPnl.toFixed(2)}
                          </div>
                          {day.weekTrades > 0 && (
                            <>
                              <div className="text-xs text-theme-secondary-text">
                                {day.weekTrades} trade{day.weekTrades !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-theme-secondary-text">
                                {day.weekWinRate}% win
                              </div>
                            </>
                          )}
                        </div>
                      );
                    } else {
                      // Regular day cell
                      return (
                        <button
                          key={index}
                          onClick={() => day && !day.isPrevMonth && !day.isNextMonth && handleDayClick(day.dayStr)}
                          disabled={!day || day.isPrevMonth || day.isNextMonth}
                          className={`
                            min-h-[100px] border border-theme-border rounded-lg p-2 text-left transition-colors
                            ${!day ? 'bg-theme-surface/20 cursor-default' : 
                              day.isPrevMonth || day.isNextMonth ? 
                                'bg-theme-surface/10 cursor-default opacity-50' :
                              day && dayHasTradeData(day.dayStr) ? 
                                'bg-white hover:bg-theme-surface/50 cursor-pointer' : 
                                'bg-white hover:bg-theme-surface/30 cursor-default'
                            }
                            ${selectedDay === day?.dayStr ? 'ring-2 ring-theme-primary' : ''}
                            focus:outline-none focus:ring-2 focus:ring-theme-primary
                          `}
                          aria-label={day ? `${day.date} - ${day.tradeCount || 0} trades${dayHasTradeData(day.dayStr) && !day.isPrevMonth && !day.isNextMonth ? ' (clickable)' : ''}` : undefined}
                        >
                          {day && (
                            <>
                              <div className={`text-sm font-medium mb-1 ${day.isPrevMonth || day.isNextMonth ? 'text-theme-secondary-text opacity-75' : 'text-theme-primary-text'}`}>
                                {day.date}
                              </div>
                              {day.pnl !== undefined && !(day.isPrevMonth || day.isNextMonth) && (
                                <div className="space-y-1">
                                  <div className={`text-xs font-medium ${Number(day.pnl) >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                                    ${Number(day.pnl) >= 0 ? '+' : ''}{Number(day.pnl).toFixed(2)}
                                  </div>
                                  {(day.tradeCount || 0) > 0 && (
                                    <>
                                      <div className="text-xs text-theme-secondary-text">
                                        {day.tradeCount || 0} trade{(day.tradeCount || 0) !== 1 ? 's' : ''}
                                      </div>
                                      <div className="text-xs text-theme-secondary-text">
                                        {day.winRate}% win
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </button>
                      );
                    }
                  })}
            </div>
          </CardContent>
        </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-theme-surface border-theme-border">
                <CardContent className="p-4">
                  <div className="text-sm text-theme-secondary-text">Monthly P&L</div>
                  <div className={`text-xl font-bold ${summaryStats.monthlyPnl >= 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                    ${summaryStats.monthlyPnl >= 0 ? '+' : ''}{summaryStats.monthlyPnl.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-surface border-theme-border">
                <CardContent className="p-4">
                  <div className="text-sm text-theme-secondary-text">Trading Days</div>
                  <div className="text-xl font-bold text-theme-primary-text">{summaryStats.tradingDays}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-surface border-theme-border">
                <CardContent className="p-4">
                  <div className="text-sm text-theme-secondary-text">Total Trades</div>
                  <div className="text-xl font-bold text-theme-primary-text">{summaryStats.totalTrades}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-surface border-theme-border">
                <CardContent className="p-4">
                  <div className="text-sm text-theme-secondary-text">Avg Win Rate</div>
                  <div className="text-xl font-bold text-theme-primary-text">{summaryStats.avgWinRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Trades Table */}
            <div className="mt-6">
              <Card className="bg-theme-surface border-theme-border">
                <CardHeader>
                  <CardTitle>
                    {selectedDay 
                      ? `Trades for ${format(new Date(selectedDay), 'MMMM d, yyyy')}`
                      : `All Trades for ${format(currentDate, 'MMMM yyyy')}`
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TradesTable 
                    trades={trades}
                    showCheckboxes={false}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}