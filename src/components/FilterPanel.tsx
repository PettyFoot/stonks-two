'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import DynamicFilterDropdown from '@/components/DynamicFilterDropdown';
import AdvancedFiltersPanel from '@/components/AdvancedFiltersPanel';
import { useTradesMetadata } from '@/hooks/useTradesMetadata';
import { useGlobalFilters, type TimeFramePreset } from '@/contexts/GlobalFilterContext';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  showAdvanced?: boolean;
  className?: string;
  demo?: boolean;
}

export default function FilterPanel({ 
  showAdvanced = false,
  className = '',
  demo = false
}: FilterPanelProps) {
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const { metadata, loading: metadataLoading } = useTradesMetadata();
  const { 
    filters, 
    updateFilter, 
    clearAdvancedFilters, 
    hasAdvancedFilters,
    hasCustomTimeFilter,
    hasActiveFilters,
    setTimeRange,
    setTimeFramePreset,
    setCustomDateRange 
  } = useGlobalFilters();

  // Check if custom date filters are applied
  const hasCustomDateFilters = Boolean(filters.customDateRange?.from || filters.customDateRange?.to || filters.timeFramePreset);
  const shouldShowClearButton = hasCustomDateFilters || hasAdvancedFilters;
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse on mobile
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const clearDateAndAdvancedFilters = () => {
    clearAdvancedFilters();
    setShowAdvancedPanel(false);
  };

  
  // Calculate active filter count for summary
  const activeFilterCount = [
    filters.symbol && filters.symbol !== 'Symbol' ? 1 : 0,
    filters.tags && filters.tags.length > 0 ? 1 : 0,
    filters.side && filters.side !== 'all' ? 1 : 0,
    filters.duration && filters.duration !== 'all' ? 1 : 0,
    filters.showOpenTrades ? 1 : 0,
    hasCustomDateFilters ? 1 : 0,
    hasAdvancedFilters ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className={cn("bg-surface border-b border-default px-4 sm:px-6 py-3 sm:py-4", className)}>
      {/* Mobile Collapse Header */}
      {isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-3 text-sm font-medium text-primary"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
      
      {/* Collapsible Filter Content */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        !isExpanded && isMobile ? "max-h-0" : "max-h-[1000px]"
      )}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-4">
        {/* Left Group - Basic Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Dynamic Symbol Filter */}
        <DynamicFilterDropdown
          label="Symbol"
          value={filters.symbol}
          onChange={(value) => updateFilter('symbol', value as string)}
          options={metadata?.symbols.map(symbol => ({ value: symbol, label: symbol })) || []}
          placeholder="Symbol"
          loading={metadataLoading}
          width="w-32"
        />

        {/* Dynamic Tags Filter */}
        <DynamicFilterDropdown
          label="Tags"
          value={filters.tags}
          onChange={(value) => updateFilter('tags', value as string[])}
          options={metadata?.tags.map(tag => ({ value: tag.name, label: tag.name, count: tag.count })) || []}
          placeholder="Select"
          multiple={true}
          loading={metadataLoading}
          width="w-32"
        />

        {/* Side Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-primary">Side</label>
          <Select value={filters.side || 'all'} onValueChange={(value) => updateFilter('side', value as 'all' | 'long' | 'short')}>
            <SelectTrigger className="w-20 h-8 text-sm">
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
          <Select value={filters.duration || 'all'} onValueChange={(value) => updateFilter('duration', value as 'all' | 'intraday' | 'swing')}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="intraday">Intraday</SelectItem>
              <SelectItem value="swing">Swing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Open Trades Filter */}
        <div className="flex items-center gap-2">
          <Checkbox 
            id="openTrades"
            checked={filters.showOpenTrades || false}
            onCheckedChange={(checked) => updateFilter('showOpenTrades', checked)}
            className="h-4 w-4"
          />
          <label 
            htmlFor="openTrades" 
            className="text-sm font-medium text-primary cursor-pointer"
          >
            Open Trades
          </label>
        </div>
        </div>

        {/* Right Group - Date Controls and Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

        {/* Time Frame Preset Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-primary">Time Frame</label>
          <Select 
            value={filters.timeFramePreset || 'default'} 
            onValueChange={(value) => setTimeFramePreset(value === 'default' ? null : value as TimeFramePreset)}
          >
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Custom</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="1week">1 Week</SelectItem>
              <SelectItem value="2weeks">2 Weeks</SelectItem>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="2months">2 Months</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="lastyear">Last Year</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* From - To Date Range Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">From</span>
            <Input
              type="date"
              value={filters.customDateRange?.from || ''}
              onChange={(e) => setCustomDateRange(e.target.value, filters.customDateRange?.to)}
              className="w-32 sm:w-36 h-8 text-sm dark:hover:bg-input/50"
            />
          </div>
          <span className="text-muted hidden sm:inline">-</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">To</span>
            <Input
              type="date"
              value={filters.customDateRange?.to || ''}
              onChange={(e) => setCustomDateRange(filters.customDateRange?.from, e.target.value)}
              className="w-32 sm:w-36 h-8 text-sm dark:hover:bg-input/50"
            />
          </div>
        </div>

        {/* Action Buttons */}
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

        {/* Clear Filters Button */}
        {shouldShowClearButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearDateAndAdvancedFilters}
            className="h-8 text-negative border-negative hover:bg-negative/10 hover:text-negative hover:border-negative"
          >
            Clear Filters
          </Button>
        )}

        {/* Apply Button - only show if there are active filters */}
        {hasActiveFilters && (
          <Button 
            className="h-8 bg-positive hover:bg-positive text-white"
            onClick={() => isMobile && setIsExpanded(false)}
          >
            ✓ Apply
          </Button>
        )}
        </div>
      </div>

      {/* Applied Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.symbol && filters.symbol !== 'Symbol' && (
          <Badge variant="secondary" className="text-xs">
            Symbol: {filters.symbol}
            <button 
              onClick={() => updateFilter('symbol', undefined)}
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
              onClick={() => updateFilter('tags', undefined)}
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
              onClick={() => updateFilter('side', 'all')}
              className="ml-1 text-muted hover:text-primary"
            >
              ×
            </button>
          </Badge>
        )}
        {filters.duration && filters.duration !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Duration: {filters.duration}
            <button 
              onClick={() => updateFilter('duration', 'all')}
              className="ml-1 text-muted hover:text-primary"
            >
              ×
            </button>
          </Badge>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && showAdvancedPanel && (
        <div className="flex justify-start lg:justify-end mt-4">
          <div className="w-full lg:w-2/5 xl:w-1/3">
            <AdvancedFiltersPanel
              filters={{
                priceRange: filters.priceRange,
                volumeRange: filters.volumeRange,
                executionCountRange: filters.executionCountRange,
                timeRange: filters.timeOfDayRange
              }}
              onFiltersChange={(updatedFilters) => {
                updateFilter('priceRange', updatedFilters.priceRange);
                updateFilter('volumeRange', updatedFilters.volumeRange);
                updateFilter('executionCountRange', updatedFilters.executionCountRange);
                updateFilter('timeOfDayRange', updatedFilters.timeRange);
              }}
              metadata={metadata ? {
                priceRange: metadata.priceRange,
                volumeRange: metadata.volumeRange,
                executionCountRange: metadata.executionCountRange
              } : undefined}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}