'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, Tag } from 'lucide-react';

export default function DemoJournal() {
  const mockJournalEntries = [
    {
      id: 1,
      date: '2025-04-09',
      title: 'Market Analysis - Tech Stocks',
      content: 'Tech sector showing strong momentum today. AAPL breaking key resistance levels...',
      tags: ['tech', 'analysis'],
      trades: 3
    },
    {
      id: 2,
      date: '2025-04-08',
      title: 'Trading Psychology Notes',
      content: 'Need to work on patience and risk management. Cut losses quicker today...',
      tags: ['psychology', 'risk-management'],
      trades: 1
    },
    {
      id: 3,
      date: '2025-04-07',
      title: 'Weekly Strategy Review',
      content: 'Overall good week. Win rate improved to 65%. Focus areas for next week...',
      tags: ['strategy', 'review'],
      trades: 7
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Journal" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-primary">Trading Journal</h2>
          <Button className="bg-[#16A34A] hover:bg-[#15803d] text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {mockJournalEntries.map((entry) => (
            <Card key={entry.id} className="bg-surface border-default hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium text-primary mb-2">
                      {entry.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {entry.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {entry.trades} trades linked
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                        <Tag className="h-2 w-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted leading-relaxed">{entry.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">12</div>
              <div className="text-sm text-muted">Total Entries</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">45</div>
              <div className="text-sm text-muted">Trades Analyzed</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">8</div>
              <div className="text-sm text-muted">Tags Used</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}