'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FilterOptions } from '@/types';
import { mockJournalEntries } from '@/data/mockData';
import { Lock } from 'lucide-react';

export default function Journal() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [notes, setNotes] = useState('');

  // For demo, use the first journal entry
  const journalEntry = mockJournalEntries[0];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Journal" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        filters={filters}
        onFiltersChange={setFilters}
        showCustomFilters={true}
        showAdvanced={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Journal Entry Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">{journalEntry.date}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">P&L:</span>
                  <span className={`text-lg font-semibold ${
                    journalEntry.pnl >= 0 ? 'text-positive' : 'text-negative'
                  }`}>
                    ${journalEntry.pnl.toFixed(2)}
                  </span>
                  <Lock className="h-3 w-3 text-muted" />
                </div>
              </div>
            </div>

            <div className="text-right">
              <Button className="bg-[#16A34A] hover:bg-[#15803d] text-white">
                Create New Journal Entry
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Chart and Stats */}
          <div className="col-span-4 space-y-6">
            {/* Chart Placeholder */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Chart</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                  <div className="text-center text-muted">
                    <div className="w-16 h-12 bg-[#16A34A] opacity-20 rounded mx-auto mb-2"></div>
                    <div className="text-xs">Trading Chart</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">Total Trades</div>
                    <div className="text-lg font-bold text-primary">{journalEntry.totalTrades}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">Win %</div>
                    <div className="text-lg font-bold text-[#16A34A]">
                      {journalEntry.winRate ? journalEntry.winRate.toFixed(0) : '0'}%
                    </div>
                    <Lock className="h-3 w-3 text-muted mx-auto mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">Total Volume</div>
                    <div className="text-lg font-bold text-primary">{journalEntry.totalVolume.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">MFE/MAE Ratio</div>
                    <div className="text-lg font-bold text-primary">
                      {journalEntry.mfeRatio || 0}
                    </div>
                    <Lock className="h-3 w-3 text-muted mx-auto mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">Commissions/Fees</div>
                    <div className="text-lg font-bold text-primary">
                      ${journalEntry.commissions || 0}
                    </div>
                    <Lock className="h-3 w-3 text-muted mx-auto mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted mb-1">Net P&L</div>
                    <div className={`text-lg font-bold ${
                      (journalEntry.netPnl || journalEntry.pnl) >= 0 ? 'text-positive' : 'text-negative'
                    }`}>
                      ${(journalEntry.netPnl || journalEntry.pnl).toFixed(2)}
                    </div>
                    <Lock className="h-3 w-3 text-muted mx-auto mt-1" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Notes and Data */}
          <div className="col-span-8 space-y-6">
            {/* Notes Section */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white">
                    Create Note
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    Insert template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Click here to start typing your notes..."
                  className="min-h-[120px] resize-none"
                />
              </CardContent>
            </Card>

            {/* Most Common Tags */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Most Common Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">Comm</Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">Gross</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Trades Table */}
            <div>
              <TradesTable 
                trades={journalEntry.trades}
                showCheckboxes={false}
                showPagination={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}