'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterOptions, ReportsFilterOptions, FilterTimeframe } from '@/types';
import { Settings } from 'lucide-react';
import DynamicFilterDropdown from '@/components/DynamicFilterDropdown';
import AdvancedFiltersPanel from '@/components/AdvancedFiltersPanel';
import TimeframeSelector from '@/components/TimeframeSelector';
import { useTradesMetadata } from '@/hooks/useTradesMetadata';

interface FilterPanelProps {
  filters: FilterOptions | ReportsFilterOptions;
  onFiltersChange: (filters: FilterOptions | ReportsFilterOptions) => void;
  showAdvanced?: boolean;
  showTimeframes?: boolean;
  className?: string;
  demo?: boolean;
}

export default function FilterPanel({ 
  filters, 
  onFiltersChange, 
  showAdvanced = false,
  showTimeframes = false,
  className = '',
  demo = false
}: FilterPanelProps) {
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const { metadata, loading: metadataLoading } = useTradesMetadata(demo);

  // Check if any filters are applied
  const hasSymbolFilter = Boolean(filters.symbol && filters.symbol !== 'all');
  const hasTagsFilter = Boolean(filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0);
  const hasSideFilter = Boolean(filters.side && filters.side !== 'all');
  const hasDurationFilter = Boolean(filters.duration && filters.duration !== 'All');
  const hasDateFilters = Boolean(
    ('dateFrom' in filters && filters.dateFrom) || 
    ('dateTo' in filters && filters.dateTo)
  );
  const hasFilterTimeframe = Boolean((filters as ReportsFilterOptions).predefinedTimeframe);
  const hasAdvancedFilters = Boolean(
    filters.priceRange || 
    filters.volumeRange || 
    filters.executionCountRange || 
    filters.timeRange
  );
  const hasActiveFilters = hasSymbolFilter || hasTagsFilter || hasSideFilter || hasDurationFilter || hasDateFilters || hasFilterTimeframe || hasAdvancedFilters;
  const shouldShowClearButton = hasDateFilters || hasFilterTimeframe || hasAdvancedFilters;

  const clearDateAndAdvancedFilters = () => {
    const newFilters = { ...filters };
    // Remove date filters if they exist
    if ('dateFrom' in newFilters) delete newFilters.dateFrom;
    if ('dateTo' in newFilters) delete newFilters.dateTo;
    // Remove timeframe if it exists
    if ('predefinedTimeframe' in newFilters) {
      (newFilters as ReportsFilterOptions).predefinedTimeframe = undefined;
      (newFilters as ReportsFilterOptions).customTimeRange = false;
    }
    // Remove advanced filters
    delete newFilters.priceRange;
    delete newFilters.volumeRange;
    delete newFilters.executionCountRange;
    delete newFilters.timeRange;
    
    onFiltersChange(newFilters);
    setShowAdvancedPanel(false);
  };
  return (
    <div className={`bg-surface border-b px-6 py-4 ${hasActiveFilters ? 'border-blue-300 bg-blue-50/30' : 'border-default'} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-blue-600 font-medium">Filters Active</span>
            </div>
          )}
          {/* Dynamic Symbol Filter */}
          <DynamicFilterDropdown
            label="Symbol"
            value={filters.symbol}
            onChange={(value) => onFiltersChange({...filters, symbol: value as string})}
            options={metadata?.symbols.map(symbol => ({ value: symbol, label: symbol })) || []}
            placeholder={metadata?.symbols.length ? "All Symbols" : "No symbols"}
            loading={metadataLoading}
            width="w-32"
          />

          {/* Dynamic Tags Filter */}
          <DynamicFilterDropdown
            label="Tags"
            value={filters.tags}
            onChange={(value) => onFiltersChange({...filters, tags: value as string[]})}
            options={metadata?.tags.map(tag => ({ value: tag.name, label: tag.name, count: tag.count })) || []}
            placeholder={metadata?.tags.length ? "All Tags" : "No tags"}
            multiple={true}
            loading={metadataLoading}
            width="w-32"
          />

          {/* Side Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary">Side</label>
            <Select value={filters.side || 'all'} onValueChange={(value) => onFiltersChange({...filters, side: value as 'all' | 'long' | 'short'})}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary">Duration</label>
            <Select value={filters.duration || 'All'} onValueChange={(value) => onFiltersChange({...filters, duration: value as 'all' | 'intraday' | 'multiday'})}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="intraday">Intraday</SelectItem>
                <SelectItem value="multiday">Multiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2">
          {/* Predefined Timeframes */}
          {showTimeframes && (
            <TimeframeSelector
              value={(filters as ReportsFilterOptions).predefinedTimeframe}
              onValueChange={(timeframe: FilterTimeframe) => 
                onFiltersChange({
                  ...filters,
                  predefinedTimeframe: timeframe,
                  customTimeRange: false,
                  dateFrom: undefined,
                  dateTo: undefined,
                } as ReportsFilterOptions)
              }
              className={`transition-all duration-200 ${(filters as ReportsFilterOptions).predefinedTimeframe ? 'ring-1 ring-primary/30' : ''}`}
            />
          )}

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={('dateFrom' in filters && filters.dateFrom) || ''} 
              onChange={(e) => {
                const newFilters = {
                  ...filters,
                  dateFrom: e.target.value,
                  predefinedTimeframe: undefined,
                  customTimeRange: true
                } as any;
                onFiltersChange(newFilters);
              }}
              className={`w-36 h-8 text-sm transition-all duration-200 ${(filters as any).dateFrom ? 'ring-1 ring-primary/30' : ''}`}
              placeholder="From - To"
            />
            <span className="text-muted">-</span>
            <Input 
              type="date" 
              value={('dateTo' in filters && filters.dateTo) || ''} 
              onChange={(e) => {
                const newFilters = {
                  ...filters,
                  dateTo: e.target.value,
                  predefinedTimeframe: undefined,
                  customTimeRange: true
                } as any;
                onFiltersChange(newFilters);
              }}
              className={`w-36 h-8 text-sm transition-all duration-200 ${(filters as any).dateTo ? 'ring-1 ring-primary/30' : ''}`}
            />
            
            {/* Clear Date and Advanced Filters Button */}
            {shouldShowClearButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateAndAdvancedFilters}
                className="h-8 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-700"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Button */}
          {showAdvanced && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Advanced
            </Button>
          )}


          {/* Apply Button */}
          <Button className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white">
            ✓
          </Button>
        </div>
      </div>

      {/* Applied Filters */}
      <div className="flex items-center gap-2">
        {filters.symbol && filters.symbol !== 'Symbol' && (
          <Badge variant="secondary" className="text-xs">
            Symbol: {filters.symbol}
            <button 
              onClick={() => onFiltersChange({...filters, symbol: undefined})}
              className="ml-1 text-muted hover:text-primary"
            >
              ×
            </button>
          </Badge>
        )}
        {filters.tags && filters.tags.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            Tags: {filters.tags.join(', ')}
            <button 
              onClick={() => onFiltersChange({...filters, tags: undefined})}
              className="ml-1 text-muted hover:text-primary"
            >
              ×
            </button>
          </Badge>
        )}
        {filters.side && filters.side !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Side: {filters.side}
            <button 
              onClick={() => onFiltersChange({...filters, side: undefined})}
              className="ml-1 text-muted hover:text-primary"
            >
              ×
            </button>
          </Badge>
        )}
      </div>


      {/* Advanced Filters Panel */}
      {showAdvanced && showAdvancedPanel && (
        <div className="mt-4">
          <AdvancedFiltersPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            metadata={metadata ? {
              priceRange: metadata.priceRange,
              volumeRange: metadata.volumeRange,
              executionCountRange: metadata.executionCountRange
            } : undefined}
          />
        </div>
      )}
    </div>
  );
}