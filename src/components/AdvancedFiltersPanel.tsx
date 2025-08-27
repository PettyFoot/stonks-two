'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterOptions } from '@/types';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface AdvancedFiltersPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  metadata?: {
    priceRange: { min: number; max: number };
    volumeRange: { min: number; max: number };
    executionCountRange: { min: number; max: number };
  };
  className?: string;
}

export default function AdvancedFiltersPanel({
  filters,
  onFiltersChange,
  metadata,
  className = ''
}: AdvancedFiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    priceMin: filters.priceRange?.min?.toString() || '',
    priceMax: filters.priceRange?.max?.toString() || '',
    volumeMin: filters.volumeRange?.min?.toString() || '',
    volumeMax: filters.volumeRange?.max?.toString() || '',
    executionMin: filters.executionCountRange?.min?.toString() || '',
    executionMax: filters.executionCountRange?.max?.toString() || '',
    timeStart: filters.timeRange?.start || '',
    timeEnd: filters.timeRange?.end || ''
  });

  // Debounced filter update
  const updateFilters = useCallback(() => {
    const newFilters = { ...filters };

    // Price range
    if (tempFilters.priceMin || tempFilters.priceMax) {
      newFilters.priceRange = {
        min: tempFilters.priceMin ? parseFloat(tempFilters.priceMin) : metadata?.priceRange.min || 0,
        max: tempFilters.priceMax ? parseFloat(tempFilters.priceMax) : metadata?.priceRange.max || 1000000
      };
    } else {
      delete newFilters.priceRange;
    }

    // Volume range
    if (tempFilters.volumeMin || tempFilters.volumeMax) {
      newFilters.volumeRange = {
        min: tempFilters.volumeMin ? parseInt(tempFilters.volumeMin) : metadata?.volumeRange.min || 0,
        max: tempFilters.volumeMax ? parseInt(tempFilters.volumeMax) : metadata?.volumeRange.max || 1000000
      };
    } else {
      delete newFilters.volumeRange;
    }

    // Execution count range
    if (tempFilters.executionMin || tempFilters.executionMax) {
      newFilters.executionCountRange = {
        min: tempFilters.executionMin ? parseInt(tempFilters.executionMin) : metadata?.executionCountRange.min || 1,
        max: tempFilters.executionMax ? parseInt(tempFilters.executionMax) : metadata?.executionCountRange.max || 100
      };
    } else {
      delete newFilters.executionCountRange;
    }

    // Time range
    if (tempFilters.timeStart || tempFilters.timeEnd) {
      newFilters.timeRange = {
        start: tempFilters.timeStart || '00:00',
        end: tempFilters.timeEnd || '23:59'
      };
    } else {
      delete newFilters.timeRange;
    }

    onFiltersChange(newFilters);
  }, [tempFilters, filters, metadata, onFiltersChange]);

  const handleTempFilterChange = (key: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllAdvancedFilters = () => {
    setTempFilters({
      priceMin: '',
      priceMax: '',
      volumeMin: '',
      volumeMax: '',
      executionMin: '',
      executionMax: '',
      timeStart: '',
      timeEnd: ''
    });
    
    const newFilters = { ...filters };
    delete newFilters.priceRange;
    delete newFilters.volumeRange;
    delete newFilters.executionCountRange;
    delete newFilters.timeRange;
    onFiltersChange(newFilters);
  };

  const hasAdvancedFilters = Boolean(
    filters.priceRange || 
    filters.volumeRange || 
    filters.executionCountRange || 
    filters.timeRange
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.priceRange) count++;
    if (filters.volumeRange) count++;
    if (filters.executionCountRange) count++;
    if (filters.timeRange) count++;
    return count;
  };

  return (
    <div className={`bg-surface border border-default rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          Advanced Filters
          {hasAdvancedFilters && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {hasAdvancedFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllAdvancedFilters}
            className="text-xs text-muted hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary block mb-1">Price Range</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={`Min ${metadata?.priceRange.min ? `(${metadata.priceRange.min})` : ''}`}
                  value={tempFilters.priceMin}
                  onChange={(e) => handleTempFilterChange('priceMin', e.target.value)}
                  className="h-8 text-sm"
                  step="0.01"
                />
                <span className="text-muted">-</span>
                <Input
                  type="number"
                  placeholder={`Max ${metadata?.priceRange.max ? `(${metadata.priceRange.max})` : ''}`}
                  value={tempFilters.priceMax}
                  onChange={(e) => handleTempFilterChange('priceMax', e.target.value)}
                  className="h-8 text-sm"
                  step="0.01"
                />
              </div>
            </div>

            {/* Volume Range */}
            <div>
              <label className="text-sm font-medium text-primary block mb-1">Volume Range</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={`Min ${metadata?.volumeRange.min ? `(${metadata.volumeRange.min})` : ''}`}
                  value={tempFilters.volumeMin}
                  onChange={(e) => handleTempFilterChange('volumeMin', e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted">-</span>
                <Input
                  type="number"
                  placeholder={`Max ${metadata?.volumeRange.max ? `(${metadata.volumeRange.max})` : ''}`}
                  value={tempFilters.volumeMax}
                  onChange={(e) => handleTempFilterChange('volumeMax', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Execution Count Range */}
            <div>
              <label className="text-sm font-medium text-primary block mb-1">Execution Count</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={`Min ${metadata?.executionCountRange.min ? `(${metadata.executionCountRange.min})` : ''}`}
                  value={tempFilters.executionMin}
                  onChange={(e) => handleTempFilterChange('executionMin', e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted">-</span>
                <Input
                  type="number"
                  placeholder={`Max ${metadata?.executionCountRange.max ? `(${metadata.executionCountRange.max})` : ''}`}
                  value={tempFilters.executionMax}
                  onChange={(e) => handleTempFilterChange('executionMax', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Time Range */}
            <div>
              <label className="text-sm font-medium text-primary block mb-1">Time of Day</label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  placeholder="Start"
                  value={tempFilters.timeStart}
                  onChange={(e) => handleTempFilterChange('timeStart', e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted">-</span>
                <Input
                  type="time"
                  placeholder="End"
                  value={tempFilters.timeEnd}
                  onChange={(e) => handleTempFilterChange('timeEnd', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end">
            <Button
              onClick={updateFilters}
              className="bg-positive hover:bg-positive text-white"
              size="sm"
            >
              Apply Advanced Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}