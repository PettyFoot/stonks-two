'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DemoCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 3, 1)); // April 2025

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mock trading data for specific dates
  const tradingData: { [key: string]: { pnl: number; trades: number; winRate: number } } = {
    '2025-04-07': { pnl: 3.72, trades: 7, winRate: 42.86 },
    '2025-04-08': { pnl: 244.23, trades: 1, winRate: 100 },
    '2025-04-09': { pnl: 189.33, trades: 2, winRate: 50 },
    '2025-04-15': { pnl: -45.67, trades: 3, winRate: 33.33 },
    '2025-04-22': { pnl: 127.89, trades: 4, winRate: 75 }
  };

  const formatDateKey = (day: number) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayData = tradingData[dateKey];
      const isToday = day === 9 && currentDate.getMonth() === 3; // April 9th for demo

      days.push(
        <Card key={day} className={`h-24 cursor-pointer transition-colors ${
          isToday ? 'border-blue-500 bg-blue-50' : 'border-default hover:border-gray-300'
        }`}>
          <CardContent className="p-2 h-full flex flex-col">
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-medium ${
                isToday ? 'text-blue-700' : 'text-primary'
              }`}>
                {day}
              </span>
              {dayData && (
                <span className={`text-xs px-1 rounded ${
                  dayData.pnl >= 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dayData.trades}
                </span>
              )}
            </div>
            {dayData && (
              <div className="flex-1 flex flex-col justify-end">
                <div className={`text-xs font-semibold ${
                  dayData.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${dayData.pnl > 0 ? '+' : ''}${dayData.pnl}
                </div>
                <div className="text-xs text-muted">
                  {dayData.winRate}% win
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Calendar" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((dayName) => (
            <div key={dayName} className="text-center text-sm font-medium text-muted py-2">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {renderCalendarDays()}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[var(--theme-green)] mb-1">$519.61</div>
              <div className="text-sm text-muted">Total P&L This Month</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">17</div>
              <div className="text-sm text-muted">Total Trades</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[var(--theme-green)] mb-1">58.8%</div>
              <div className="text-sm text-muted">Win Rate</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">5</div>
              <div className="text-sm text-muted">Trading Days</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}