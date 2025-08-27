'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTrades, setSearchTrades] = useState(true);
  const [searchJournalEntries, setSearchJournalEntries] = useState(false);
  const [searchComments, setSearchComments] = useState(false);

  const handleSearch = () => {
    // Handle search functionality
    console.log('Searching for:', { 
      query: searchQuery, 
      trades: searchTrades, 
      journal: searchJournalEntries, 
      comments: searchComments 
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Search" 
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Header */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-primary mb-2">Search</h2>
            <p className="text-muted">
              Search your trade notes, journal notes, and comments made on your trades/notes:
            </p>
          </div>

          {/* Search Form */}
          <Card className="bg-surface border-default p-6">
            <div className="space-y-6">
              {/* Search Input */}
              <div>
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search terms..."
                  className="w-full text-base h-12"
                />
              </div>

              {/* Search Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="trades"
                    checked={searchTrades}
                    onCheckedChange={(checked) => setSearchTrades(!!checked)}
                  />
                  <label 
                    htmlFor="trades" 
                    className="text-sm font-medium text-primary cursor-pointer"
                  >
                    Trades
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="journal"
                    checked={searchJournalEntries}
                    onCheckedChange={(checked) => setSearchJournalEntries(!!checked)}
                  />
                  <label 
                    htmlFor="journal" 
                    className="text-sm font-medium text-primary cursor-pointer"
                  >
                    Journal entries
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="comments"
                    checked={searchComments}
                    onCheckedChange={(checked) => setSearchComments(!!checked)}
                  />
                  <label 
                    htmlFor="comments" 
                    className="text-sm font-medium text-primary cursor-pointer"
                  >
                    Comments
                  </label>
                </div>
              </div>

              {/* Search Button */}
              <div className="text-center">
                <Button 
                  className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white px-8"
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </div>
          </Card>

          {/* Search Info */}
          <div className="mt-6 text-center text-sm text-muted">
            <p>
              <strong>Note:</strong> the global trade filter is ignored when searching trade notes, journal notes, and comments made on your trades/notes.
            </p>
          </div>

          {/* Search Results Placeholder */}
          {searchQuery && (
            <div className="mt-8">
              <Card className="bg-surface border-default p-6">
                <div className="text-center text-muted">
                  <p>Search results will appear here...</p>
                  <p className="text-sm mt-2">
                    Searching in: {[
                      searchTrades && 'Trades',
                      searchJournalEntries && 'Journal entries',
                      searchComments && 'Comments'
                    ].filter(Boolean).join(', ') || 'None selected'}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}