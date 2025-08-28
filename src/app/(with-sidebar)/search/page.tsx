'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import TradesTable from '@/components/TradesTable';
import { useTradesData } from '@/hooks/useTradesData';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use the same data hook as the Trades page
  const { data: tradesData, loading, error } = useTradesData(false);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Filter trades based on search query (client-side)
  const searchResults = useMemo(() => {
    const trades = tradesData?.trades || [];
    
    if (!debouncedQuery.trim()) {
      return [];
    }

    const query = debouncedQuery.toLowerCase();
    
    return trades.filter(trade => {
      // Search in symbol (case-insensitive)
      if (trade.symbol?.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in notes (case-insensitive)
      if (trade.notes?.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in tags (case-insensitive)
      if (trade.tags?.some(tag => tag.toLowerCase().includes(query))) {
        return true;
      }
      
      return false;
    });
  }, [tradesData?.trades, debouncedQuery]);

  const hasSearched = !!debouncedQuery.trim();

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Search" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        demo={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Header */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-primary mb-2">Search</h2>
            <p className="text-muted">
              Search your trades by symbol or notes. Results appear automatically as you type.
            </p>
          </div>

          {/* Search Input */}
          <Card className="bg-surface border-default p-6">
            <div className="space-y-4">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Start typing to search trades..."
                className="w-full text-base h-12"
              />
              {loading && (
                <div className="text-center text-sm text-muted">
                  <span className="animate-pulse">Loading trades...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Search Info */}
          <div className="mt-6 text-center text-sm text-muted">
            <p>
              <strong>Note:</strong> Searching through trades already filtered by your current global settings.
            </p>
          </div>

          {/* Search Results */}
          {error && (
            <div className="mt-8">
              <Card className="bg-surface border-default p-6">
                <div className="text-center text-red-500">
                  <p>Error: {error}</p>
                </div>
              </Card>
            </div>
          )}
          
          {searchResults.length > 0 && !loading && (
            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              <TradesTable 
                trades={searchResults}
                showCheckboxes={false}
              />
            </div>
          )}
          
          {hasSearched && searchResults.length === 0 && !loading && !error && (
            <div className="mt-8">
              <Card className="bg-surface border-default p-6">
                <div className="text-center text-muted">
                  <p>No trades found matching &ldquo;{searchQuery}&rdquo;</p>
                </div>
              </Card>
            </div>
          )}
          
          {!hasSearched && !loading && (
            <div className="mt-8">
              <Card className="bg-surface border-default p-6">
                <div className="text-center text-muted">
                  <p>Start typing to search your trades by symbol, notes, or tags.</p>
                  {tradesData?.trades && (
                    <p className="text-sm mt-2">
                      Searching through {tradesData.trades.length} trades
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}