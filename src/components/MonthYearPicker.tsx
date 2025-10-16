'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MonthYearPickerProps {
  children: React.ReactNode;
  currentMonth?: number; // 0-11
  currentYear: number;
  onSelect: (month: number | undefined, year: number) => void;
  yearOnly?: boolean;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthYearPicker({
  children,
  currentMonth,
  currentYear,
  onSelect,
  yearOnly = false
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Check if there are pending changes
  const hasChanges = selectedMonth !== currentMonth || selectedYear !== currentYear;

  // Reset to current values when popover opens
  useEffect(() => {
    if (open) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [open, currentMonth, currentYear]);

  const handleConfirm = () => {
    onSelect(yearOnly ? undefined : selectedMonth, selectedYear);
    setOpen(false);
  };

  const handleYearIncrement = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleYearDecrement = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1900 && value <= 2100) {
      setSelectedYear(value);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white/95 backdrop-blur-md border-theme-border/50 shadow-2xl rounded-2xl"
        align="center"
      >
        <div className="p-6 space-y-4">
          {/* Year Selector */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleYearDecrement}
              className="h-8 w-8 rounded-full hover:bg-theme-green/10 transition-all bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <Input
              type="number"
              value={selectedYear}
              onChange={handleYearInputChange}
              className="w-24 text-center text-xl font-bold text-gray-900 border-theme-border/50 rounded-xl focus:ring-2 focus:ring-theme-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1900}
              max={2100}
              style={{ textAlign: 'center' }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleYearIncrement}
              className="h-8 w-8 rounded-full hover:bg-theme-green/10 transition-all bg-gray-100"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </Button>
          </div>

          {/* Month Grid - Only show if not year-only mode */}
          {!yearOnly && (
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((month, index) => (
                <Button
                  key={month}
                  variant="outline"
                  onClick={() => setSelectedMonth(index)}
                  className={`
                    h-10 text-sm rounded-xl transition-all duration-200
                    ${selectedMonth === index
                      ? 'bg-theme-green/10 border-theme-green text-theme-green font-bold hover:bg-theme-green/20 shadow-md'
                      : 'border-theme-border/50 text-theme-primary-text hover:bg-theme-surface hover:border-theme-green/40'
                    }
                  `}
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          )}

          {/* Confirm Button - Only show when there are pending changes */}
          {hasChanges && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleConfirm}
                className="w-full bg-theme-green hover:bg-theme-green/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Confirm
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
