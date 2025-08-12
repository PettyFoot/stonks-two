'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterOptions } from '@/types';
import { Settings, ChevronDown } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  showCustomFilters?: boolean;
  showAdvanced?: boolean;
  className?: string;
}

export default function FilterPanel({ 
  filters, 
  onFiltersChange, 
  showCustomFilters = true,
  showAdvanced = false,
  className = '' 
}: FilterPanelProps) {
  return (
    <div className={`bg-surface border-b border-default px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Symbol Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary">Symbol</label>
            <Select value={filters.symbol || 'Symbol'} onValueChange={(value) => onFiltersChange({...filters, symbol: value === 'Symbol' ? undefined : value})}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Symbol">All Symbols</SelectItem>
                <SelectItem value="JNVR">JNVR</SelectItem>
                <SelectItem value="AREB">AREB</SelectItem>
                <SelectItem value="TSLA">TSLA</SelectItem>
                <SelectItem value="NVDA">NVDA</SelectItem>
                <SelectItem value="AAPL">AAPL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary">Tags</label>
            <Select value={filters.tags?.[0] || 'Select'} onValueChange={(value) => onFiltersChange({...filters, tags: value === 'Select' ? undefined : [value]})}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Select">All Tags</SelectItem>
                <SelectItem value="momentum">Momentum</SelectItem>
                <SelectItem value="breakout">Breakout</SelectItem>
                <SelectItem value="scalp">Scalp</SelectItem>
                <SelectItem value="reversal">Reversal</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Side Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary">Side</label>
            <Select value={filters.side || 'All'} onValueChange={(value) => onFiltersChange({...filters, side: value as 'all' | 'long' | 'short'})}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
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
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={filters.dateFrom || ''} 
              onChange={(e) => onFiltersChange({...filters, dateFrom: e.target.value})}
              className="w-36 h-8 text-sm"
              placeholder="From - To"
            />
            <span className="text-muted">-</span>
            <Input 
              type="date" 
              value={filters.dateTo || ''} 
              onChange={(e) => onFiltersChange({...filters, dateTo: e.target.value})}
              className="w-36 h-8 text-sm"
            />
          </div>

          {/* Advanced Button */}
          {showAdvanced && (
            <Button variant="outline" size="sm" className="h-8">
              <Settings className="h-3 w-3 mr-1" />
              Advanced
            </Button>
          )}

          {/* Custom Filters Dropdown */}
          {showCustomFilters && (
            <Button variant="outline" size="sm" className="h-8">
              Custom Filters
              <ChevronDown className="h-3 w-3 ml-1" />
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
    </div>
  );
}