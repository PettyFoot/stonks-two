'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeframeOption, FilterTimeframe } from '@/types';

interface TimeframeSelectorProps {
  value?: FilterTimeframe;
  onValueChange: (value: FilterTimeframe) => void;
  className?: string;
}

const timeframeOptions: TimeframeOption[] = [
  { value: 'yesterday', label: 'Yesterday', days: 1, description: 'Previous trading day' },
  { value: '1w', label: '1 Week', days: 7, description: 'Last 7 days' },
  { value: '2w', label: '2 Weeks', days: 14, description: 'Last 14 days' },
  { value: '1m', label: '1 Month', days: 30, description: 'Last 30 days' },
  { value: '3m', label: '3 Months', days: 90, description: 'Last 90 days' },
  { value: '6m', label: '6 Months', days: 180, description: 'Last 180 days' },
  { value: 'ytd', label: 'Year to Date', description: 'From January 1st to today' },
  { value: 'last-year', label: 'Last Year', days: 365, description: 'Previous 365 days' },
];

export default function TimeframeSelector({ value, onValueChange, className }: TimeframeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <label className="text-sm font-medium whitespace-nowrap text-primary">
        Timeframe
      </label>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {timeframeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Export the options for use in other components
export { timeframeOptions };