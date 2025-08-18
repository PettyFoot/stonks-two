'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mockCalendarData = [
  { date: 5, pnl: 437.28, trades: 3, winRate: 100 },
  { date: 12, pnl: -125.50, trades: 2, winRate: 50 },
  { date: 19, pnl: 892.15, trades: 5, winRate: 80 },
  { date: 26, pnl: 234.67, trades: 4, winRate: 75 },
];

export default function CalendarPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Generate calendar days for the current month
  const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentYear, currentDate.getMonth() + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const tradingData = mockCalendarData.find(data => data.date === day);
    calendarDays.push({
      date: day,
      ...tradingData
    });
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Calendar" 
        subtitle={`${currentMonth} ${currentYear}`}
        showTimeRangeFilters={false}
      />
      
      <FilterPanel showTimeRangeTabs={true} />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">{currentMonth} {currentYear}</h1>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button className="bg-[#16A34A] hover:bg-[#15803d] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Trade
          </Button>
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
              {calendarDays.map((day, index) => (
                <div 
                  key={index} 
                  className={`
                    min-h-[100px] border border-default rounded-lg p-2 
                    ${!day ? 'bg-muted/20' : 'bg-background hover:bg-muted/50 cursor-pointer transition-colors'}
                  `}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium text-primary mb-1">{day.date}</div>
                      {day.pnl !== undefined && (
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${day.pnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            ${day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {day.trades} trade{day.trades !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {day.winRate}% win
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Monthly P&L</div>
              <div className="text-xl font-bold text-[#16A34A]">+$1,438.60</div>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Trading Days</div>
              <div className="text-xl font-bold text-primary">4</div>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-xl font-bold text-primary">14</div>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
              <div className="text-xl font-bold text-primary">76%</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}