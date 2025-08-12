'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react';

export default function DemoNewTrade() {
  const [formData, setFormData] = useState({
    symbol: '',
    side: '',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    entryTime: '',
    exitTime: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="New Trade" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-2">Add New Trade</h2>
          <p className="text-sm text-muted">Manual trade entry for detailed tracking and analysis</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Trade Form */}
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trade Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., AAPL"
                    value={formData.symbol}
                    onChange={(e) => handleInputChange('symbol', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="side">Side</Label>
                  <Select value={formData.side} onValueChange={(value) => handleInputChange('side', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select side" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Number of shares"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.entryPrice}
                    onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exitPrice">Exit Price</Label>
                  <Input
                    id="exitPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.exitPrice}
                    onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryTime">Entry Time</Label>
                  <Input
                    id="entryTime"
                    type="datetime-local"
                    value={formData.entryTime}
                    onChange={(e) => handleInputChange('entryTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exitTime">Exit Time</Label>
                  <Input
                    id="exitTime"
                    type="datetime-local"
                    value={formData.exitTime}
                    onChange={(e) => handleInputChange('exitTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Trade notes, strategy, market conditions..."
                  className="min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1 bg-[#16A34A] hover:bg-[#15803d] text-white">
                  Add Trade
                </Button>
                <Button variant="outline" className="flex-1">
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trade Preview */}
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Trade Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-muted mb-2">$0.00</div>
                <div className="text-sm text-muted">Estimated P&L</div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Position Size</span>
                  <span className="text-sm font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Entry Value</span>
                  <span className="text-sm font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Exit Value</span>
                  <span className="text-sm font-medium">-</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Gross P&L</span>
                  <span className="text-sm font-medium">$0.00</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-medium text-blue-800 mb-1">Demo Mode</div>
                <div className="text-xs text-blue-600">
                  This trade won't be saved to your account. Sign up to track real trades.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}