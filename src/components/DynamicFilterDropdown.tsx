'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface DynamicFilterDropdownProps {
  label: string;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  options: Array<{ value: string; label: string; count?: number }>;
  placeholder?: string;
  multiple?: boolean;
  loading?: boolean;
  className?: string;
  width?: string;
}

export default function DynamicFilterDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  multiple = false,
  loading = false,
  className = '',
  width = 'w-32'
}: DynamicFilterDropdownProps) {
  const handleValueChange = (newValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (newValue === 'all' || newValue === placeholder) {
        onChange([]);
      } else {
        // Toggle selection for multiple values
        const updatedValues = currentValues.includes(newValue)
          ? currentValues.filter(v => v !== newValue)
          : [...currentValues, newValue];
        onChange(updatedValues);
      }
    } else {
      onChange(newValue === 'all' || newValue === placeholder ? '' : newValue);
    }
  };

  const displayValue = () => {
    if (multiple && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} selected` : placeholder;
    }
    return value || placeholder;
  };

  // Sort options by count (descending) if available, otherwise alphabetically
  const sortedOptions = [...options].sort((a, b) => {
    if (a.count !== undefined && b.count !== undefined) {
      return b.count - a.count; // Highest count first
    }
    return a.label.localeCompare(b.label); // Alphabetical fallback
  });

  const isSelected = (optionValue: string) => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <label className="text-sm font-medium text-primary">{label}</label>
        <div className={`${width} h-8 bg-surface border border-default rounded-md animate-pulse`}></div>
      </div>
    );
  }

  const hasActiveSelection = () => {
    if (multiple && Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value && value !== 'all');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className={`text-sm font-medium ${hasActiveSelection() ? 'text-blue-600' : 'text-primary'}`}>
        {label}
        {hasActiveSelection() && <span className="ml-1 text-blue-500">•</span>}
      </label>
      <Select value={displayValue()} onValueChange={handleValueChange}>
        <SelectTrigger className={`${width} h-8 text-sm ${hasActiveSelection() ? 'border-blue-300 bg-blue-50' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label}</SelectItem>
          {sortedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center justify-between w-full">
                <span className={isSelected(option.value) ? 'font-medium' : ''}>
                  {option.label}
                </span>
                {option.count !== undefined && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {option.count}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Display selected tags as badges for multiple selection */}
      {multiple && Array.isArray(value) && value.length > 0 && (
        <div className="flex gap-1 flex-wrap max-w-xs">
          {value.slice(0, 3).map((selectedValue) => (
            <Badge 
              key={selectedValue} 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                const updatedValues = value.filter(v => v !== selectedValue);
                onChange(updatedValues);
              }}
            >
              {selectedValue}
              <span className="ml-1">×</span>
            </Badge>
          ))}
          {value.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{value.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}