'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DayData } from '@/types';

interface KPICardsProps {
  days: DayData[];
  className?: string;
}

export default function KPICards({ days, className }: KPICardsProps) {
  return (
    <div className={cn('grid grid-cols-7 gap-4', className)}>
      {days.map((day) => {
        const date = new Date(day.date);
        const dayNumber = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = date.toDateString() === new Date().toDateString();
        const hasData = day.trades > 0;

        return (
          <Card 
            key={day.date} 
            className={cn(
              'min-h-[120px] cursor-pointer transition-all hover:shadow-md',
              hasData ? 'bg-surface border-default' : 'bg-primary border-primary',
              isToday && 'ring-2 ring-tertiary'
            )}
          >
            <CardContent className="p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-primary">
                  {dayNumber}
                </div>
                <div className="text-xs text-muted uppercase">
                  {dayName}
                </div>
              </div>

              {/* P&L */}
              <div className="mb-2">
                <div className={cn(
                  'text-lg font-semibold',
                  hasData 
                    ? day.pnl >= 0 
                      ? 'text-positive' 
                      : 'text-negative'
                    : 'text-muted'
                )}>
                  ${hasData ? day.pnl.toFixed(2) : '0'}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1 text-xs text-muted">
                <div>{hasData ? day.trades : 0} trades</div>
                {hasData && day.winRate !== undefined && (
                  <div className="text-xs">
                    Win: {day.winRate.toFixed(0)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}