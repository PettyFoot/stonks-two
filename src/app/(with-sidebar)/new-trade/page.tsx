'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';

interface TradeForm {
  symbol: string;
  side: string;
  volume: string;
  executions: string;
  pnl: string;
  date: string;
  time: string;
  notes: string;
  tags: string[];
}

export default function NewTrade() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState<TradeForm>({
    symbol: '',
    side: 'long',
    volume: '',
    executions: '1',
    pnl: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    notes: '',
    tags: []
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-tertiary)]"></div>
    </div>;
  }

  if (!user) return null;

  const handleInputChange = (field: keyof TradeForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleCreateTrade = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!form.symbol || !form.side || !form.volume) {
        throw new Error('Please fill in all required fields (Symbol, Side, Volume)');
      }

      const tradeData = {
        symbol: form.symbol.toUpperCase(),
        side: form.side,
        volume: parseInt(form.volume),
        executions: parseInt(form.executions) || 1,
        pnl: form.pnl ? parseFloat(form.pnl) : 0,
        date: form.date,
        time: form.time,
        notes: form.notes,
        tags: form.tags
      };

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create trade');
      }

      setSuccess(true);
      
      // Reset form after successful creation
      setTimeout(() => {
        setForm({
          symbol: '',
          side: 'long',
          volume: '',
          executions: '1',
          pnl: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          notes: '',
          tags: []
        });
        setSuccess(false);
        setExpanded(false);
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMore = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="New Trade" 
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Instructions Banner */}
        <div className="mb-6 p-4 bg-tertiary text-white rounded-lg">
          <p className="text-sm">
            Create a new trade entry manually. You can enter basic information or expand the form for detailed trade data including P&L, execution count, and custom tags.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-[var(--theme-green)] text-white rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Trade created successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--theme-red)] text-white rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* New Trade Form */}
        <div className="max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted" />
                    <span className="text-sm text-muted">
                      {new Date(form.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted" />
                    <span className="text-sm text-muted">{form.time}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Required Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Symbol *
                    </label>
                    <Input 
                      value={form.symbol}
                      onChange={(e) => handleInputChange('symbol', e.target.value)}
                      placeholder="e.g., AAPL"
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Side *
                    </label>
                    <Select value={form.side} onValueChange={(value) => handleInputChange('side', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Volume *
                  </label>
                  <Input 
                    type="number"
                    value={form.volume}
                    onChange={(e) => handleInputChange('volume', e.target.value)}
                    placeholder="Number of shares"
                    className="w-full"
                    required
                    min="1"
                  />
                </div>

                {/* Expandable Fields */}
                {expanded && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Date
                        </label>
                        <Input 
                          type="date"
                          value={form.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Time
                        </label>
                        <Input 
                          type="time"
                          value={form.time}
                          onChange={(e) => handleInputChange('time', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Executions
                        </label>
                        <Input 
                          type="number"
                          value={form.executions}
                          onChange={(e) => handleInputChange('executions', e.target.value)}
                          placeholder="Number of executions"
                          className="w-full"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          P&L
                        </label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={form.pnl}
                          onChange={(e) => handleInputChange('pnl', e.target.value)}
                          placeholder="Profit/Loss"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Tags
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <Input 
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Add a tag"
                          className="flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <Button 
                          type="button"
                          size="sm"
                          onClick={handleAddTag}
                          variant="outline"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.tags.map((tag, index) => (
                            <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                              <span>{tag}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0 hover:bg-blue-200"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Button 
                    variant="link" 
                    className="text-[var(--theme-green)] hover:text-[var(--theme-green)]/80 p-0 h-auto text-sm"
                    onClick={handleAddMore}
                  >
                    {expanded ? 'Show less «' : 'Add more »'}
                  </Button>
                </div>

                <div>
                  <Button 
                    className="w-full bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white"
                    onClick={handleCreateTrade}
                    disabled={loading || !form.symbol || !form.volume}
                  >
                    {loading ? 'Creating...' : 'Create New Trade'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Notes */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={form.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any notes about this trade..."
                  className="min-h-[300px] resize-none"
                />
                <div className="mt-4 text-xs text-muted">
                  Use notes to record your trading strategy, market conditions, or lessons learned.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-primary mb-2">Note!</h3>
            <p className="text-sm text-muted mb-2">
              This form creates a trade to be matched later with execution data imported from your broker. If you want to manually input your trade executions, the easiest way to do this is to use Excel. Go to the{' '}
              <span className="text-[var(--theme-tertiary)] cursor-pointer hover:underline">Help</span> page, download the Sample Excel Template, and fill in your data. Then follow the instructions on that page to import your data into Trade Voyager.
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