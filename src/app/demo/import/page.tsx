'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';

export default function DemoImport() {
  const [dragActive, setDragActive] = useState(false);

  const brokers = [
    { name: 'Interactive Brokers', logo: '🏛️', status: 'Supported' },
    { name: 'TD Ameritrade', logo: '📊', status: 'Supported' },
    { name: 'E*TRADE', logo: '💹', status: 'Supported' },
    { name: 'Charles Schwab', logo: '🏦', status: 'Supported' },
    { name: 'Robinhood', logo: '🤖', status: 'Coming Soon' },
    { name: 'Webull', logo: '🐂', status: 'Coming Soon' }
  ];

  const sampleImports = [
    { date: '2025-04-09', file: 'trades_april.csv', trades: 45, status: 'success' },
    { date: '2025-04-08', file: 'march_statements.xlsx', trades: 23, status: 'success' },
    { date: '2025-04-07', file: 'q1_trades.csv', trades: 12, status: 'processing' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Demo - would normally handle file upload
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Import Trades" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Import Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-2">Import Your Trading Data</h2>
          <p className="text-sm text-muted">Upload trade statements or CSV files from your broker</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* File Upload */}
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-muted mx-auto mb-4" />
                <div className="text-lg font-medium text-primary mb-2">Drop files here</div>
                <div className="text-sm text-muted mb-4">
                  or click to browse your computer
                </div>
                <Input type="file" multiple className="hidden" />
                <Button className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)/80] text-white">
                  Choose Files
                </Button>
              </div>

              <div className="text-xs text-muted">
                Supported formats: CSV, XLSX, PDF statements
              </div>

              {/* Demo Notice */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800 mb-1">Demo Mode</div>
                      <div className="text-xs text-yellow-700">
                        File uploads are disabled in demo mode. Sign up to import your real trading data.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Broker Integration */}
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                <Download className="h-4 w-4" />
                Broker Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted mb-4">
                Connect directly to your broker for automatic imports
              </div>

              <div className="space-y-3">
                {brokers.map((broker, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-default rounded-lg hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{broker.logo}</div>
                      <div>
                        <div className="font-medium text-sm text-primary">{broker.name}</div>
                        <div className={`text-xs ${
                          broker.status === 'Supported' 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {broker.status}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={broker.status !== 'Supported'}
                      className={broker.status === 'Supported' ? '' : 'opacity-50'}
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import History */}
        <Card className="bg-surface border-default mt-6">
          <CardHeader>
            <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Imports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleImports.map((import_, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-default rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      import_.status === 'success' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {import_.status === 'success' 
                        ? <CheckCircle className="h-4 w-4" />
                        : <Upload className="h-4 w-4" />
                      }
                    </div>
                    <div>
                      <div className="font-medium text-sm text-primary">{import_.file}</div>
                      <div className="text-xs text-muted">
                        {import_.date} • {import_.trades} trades
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${
                      import_.status === 'success' 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`}>
                      {import_.status === 'success' ? 'Completed' : 'Processing...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200 mt-6">
          <CardContent className="p-6">
            <div className="text-base font-medium text-blue-800 mb-3">Need Help Importing?</div>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• Download trade statements from your broker in CSV or Excel format</p>
              <p>• Make sure files include: Symbol, Side, Quantity, Entry/Exit prices, Dates</p>
              <p>• We automatically detect and map most broker formats</p>
              <p>• Contact support if you need help with a specific broker format</p>
            </div>
            <Button variant="outline" className="mt-4 border-blue-300 text-blue-700 hover:bg-blue-100">
              View Import Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}