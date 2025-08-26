'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const generateCalendarDays = () => {
    const firstDay = startOfMonth(currentDate);
    const startingDayOfWeek = getDay(firstDay);
    const daysInMonth = getDaysInMonth(currentDate);
    const calendarDays = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
      const dayData = monthData.find(d => d.day === dayStr);
      calendarDays.push({
        date: day,
        dayStr,
        ...dayData
      });
    }

    return calendarDays;
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
      
      <FilterPanel showTimeRangeTabs={false} />
      
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
                <h1 className="text-2xl font-bold text-primary">
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
            </div>

        {/* Calendar Grid */}
        <Card className="bg-surface border-default">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Trading Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => (
                    <button
                      key={index}
                      onClick={() => day && setSelectedDay(day.dayStr)}
                      disabled={!day}
                      className={`
                        min-h-[100px] border border-default rounded-lg p-2 text-left
                        ${!day ? 'bg-muted/20 cursor-default' : 'bg-background hover:bg-muted/50 cursor-pointer transition-colors'}
                        ${selectedDay === day?.dayStr ? 'ring-2 ring-primary' : ''}
                        focus:outline-none focus:ring-2 focus:ring-primary
                      `}
                      aria-label={day ? `${day.date} - ${day.tradeCount || 0} trades` : undefined}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-medium text-primary mb-1">{day.date}</div>
                          {day.pnl !== undefined && (
                            <div className="space-y-1">
                              <div className={`text-xs font-medium ${Number(day.pnl) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                ${Number(day.pnl) >= 0 ? '+' : ''}{Number(day.pnl).toFixed(2)}
                              </div>
                              {(day.tradeCount || 0) > 0 && (
                                <>
                                  <div className="text-xs text-muted-foreground">
                                    {day.tradeCount || 0} trade{(day.tradeCount || 0) !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {day.winRate}% win
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  ))}
            </div>
          </CardContent>
        </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Monthly P&L</div>
                  <div className={`text-xl font-bold ${summaryStats.monthlyPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    ${summaryStats.monthlyPnl >= 0 ? '+' : ''}{summaryStats.monthlyPnl.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Trading Days</div>
                  <div className="text-xl font-bold text-primary">{summaryStats.tradingDays}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                  <div className="text-xl font-bold text-primary">{summaryStats.totalTrades}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Avg Win Rate</div>
                  <div className="text-xl font-bold text-primary">{summaryStats.avgWinRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Trades Table */}
            <div className="mt-6">
              <Card className="bg-surface border-default">
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