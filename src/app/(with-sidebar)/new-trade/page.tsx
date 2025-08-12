'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function NewTrade() {
  const [symbol, setSymbol] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('Aug 12, 2025');

  const handleCreateTrade = () => {
    // Handle trade creation
    console.log('Creating trade:', { symbol, notes, date });
  };

  const handleAddMore = () => {
    // Handle add more fields
    console.log('Add more fields');
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="New Trade" 
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Instructions Banner */}
        <div className="mb-6 p-4 bg-[#3B82F6] text-white rounded-lg">
          <p className="text-sm">
            Make an entry in your trading journal. Entries can be made here for today only; when you import the data in later from your broker, the actual trade executions will be matched up to the notes you make here.
          </p>
        </div>

        {/* New Trade Form */}
        <div className="max-w-2xl">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Form */}
            <div className="col-span-6">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted" />
                    <span className="text-sm text-muted">{date}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Symbol
                    </label>
                    <Input 
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="Enter symbol"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Button 
                      variant="link" 
                      className="text-[#16A34A] hover:text-[#15803d] p-0 h-auto text-sm"
                      onClick={handleAddMore}
                    >
                      Add more »
                    </Button>
                  </div>

                  <div>
                    <Button 
                      className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white"
                      onClick={handleCreateTrade}
                    >
                      Create new Trade
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Notes */}
            <div className="col-span-6">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Click here to start typing your notes..."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" variant="outline" className="h-8">
                      Insert template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-primary mb-2">Note!</h3>
            <p className="text-sm text-muted mb-2">
              This form creates a trade to be matched later with execution data imported from your broker. If you want to manually input your trade executions, the easiest way to do this is to use Excel. Go to the{' '}
              <span className="text-[#2563EB] cursor-pointer hover:underline">Help</span> page, download the Sample Excel Template, and fill in your data. Then follow the instructions on that page to import your data into Trade Voyager.
            </p>
            <p className="text-sm text-muted">
              If you prefer, you can manually enter executions as well. To do this, open the trade, click the Advanced link, and then click the add execution button.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}