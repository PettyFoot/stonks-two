'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Filter, Calendar } from 'lucide-react';
import { mockTrades } from '@/data/mockData';
import { Trade } from '@/types';

export default function DemoSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Trade[]>([]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // Simple search simulation
    const results = mockTrades.filter(trade => 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setSearchResults(results);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Search" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Search Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Search Trades & Journal Entries</h2>
          
          {/* Search Input */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search by symbol, tag, note content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
              <SearchIcon className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              Recent
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Winning Trades
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Losing Trades
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              High Volume
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Tagged
            </Button>
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          {searchResults.length === 0 && !searchTerm ? (
            <Card className="bg-surface border-default">
              <CardContent className="p-8 text-center">
                <SearchIcon className="h-12 w-12 text-muted mx-auto mb-4" />
                <div className="text-lg font-medium text-primary mb-2">Search Your Trading Data</div>
                <div className="text-sm text-muted max-w-md mx-auto">
                  Find trades by symbol, analyze patterns by tags, or search through your journal entries for specific insights.
                </div>
              </CardContent>
            </Card>
          ) : searchResults.length === 0 && searchTerm ? (
            <Card className="bg-surface border-default">
              <CardContent className="p-8 text-center">
                <div className="text-lg font-medium text-primary mb-2">No results found</div>
                <div className="text-sm text-muted">
                  Try different keywords or check your filters
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted mb-4">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((trade, index) => (
                <Card key={index} className="bg-surface border-default hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold text-primary">
                          {trade.symbol}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Calendar className="h-3 w-3" />
                          {trade.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 text-xs rounded ${
                            trade.side === 'long' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.side.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            trade.pnl >= 0 ? 'text-[var(--theme-green)]' : 'text-[var(--theme-red)]'
                          }`}>
                            ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted">
                            {(trade.volume ?? 0).toLocaleString()} shares
                          </div>
                        </div>
                      </div>
                    </div>
                    {trade.tags && trade.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {trade.tags.map((tag: string, tagIndex: number) => (
                          <span key={tagIndex} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Searches */}
        {!searchTerm && (
          <div className="mt-8">
            <h3 className="text-base font-medium text-primary mb-4">Recent Searches</h3>
            <div className="flex gap-2 flex-wrap">
              {['AAPL', 'momentum', 'breakout', 'risk-management', 'tech'].map((term) => (
                <Button 
                  key={term}
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => {
                    setSearchTerm(term);
                    handleSearch();
                  }}
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}