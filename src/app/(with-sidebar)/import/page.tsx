'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ImportResult {
  success: boolean;
  importBatchId?: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export default function ImportPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
    </div>;
  }

  if (!user) return null;

  const brokerOptions = [
    { value: 'interactive_brokers', label: 'Interactive Brokers' },
    { value: 'td_ameritrade', label: 'TD Ameritrade' },
    { value: 'generic_csv', label: 'Generic CSV' }
  ];

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedBroker) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('brokerType', selectedBroker);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setImportResult(result);

      if (result.success && result.successCount > 0) {
        setTimeout(() => {
          router.push('/trades?imported=true');
        }, 2000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        totalRecords: 0,
        successCount: 0,
        errorCount: 1,
        errors: ['Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Import Trades" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Instructions */}
          <Card className="bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] border-[#BAE6FD]">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <FileText className="h-6 w-6 text-[#0369A1] mt-1" />
                <div>
                  <h3 className="font-semibold text-[#0369A1] mb-2">How to Import Your Trades</h3>
                  <ol className="text-sm text-[#0369A1] space-y-1">
                    <li>1. Export your trades from your broker as a CSV file</li>
                    <li>2. Select your broker type below</li>
                    <li>3. Upload your CSV file</li>
                    <li>4. Review and import your trades</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card className="bg-surface border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-primary">
                  Upload Trades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Broker Selection */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Select Your Broker
                  </label>
                  <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose broker..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brokerOptions.map(broker => (
                        <SelectItem key={broker.value} value={broker.value}>
                          {broker.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    CSV File
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver 
                        ? 'border-[#2563EB] bg-[#F0F9FF]' 
                        : 'border-[#E5E7EB] hover:border-[#2563EB]'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                  >
                    <Upload className="h-12 w-12 text-[#6B7280] mx-auto mb-4" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-primary">{selectedFile.name}</p>
                        <p className="text-xs text-muted">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-primary mb-2">
                          Drag and drop your CSV file here, or click to browse
                        </p>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileInput}
                          className="hidden"
                          id="file-input"
                        />
                        <label htmlFor="file-input">
                          <Button variant="outline" className="cursor-pointer">
                            Browse Files
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Button */}
                <Button 
                  onClick={handleImport}
                  disabled={!selectedFile || !selectedBroker || importing}
                  className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white"
                >
                  {importing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Trades
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="bg-surface border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-primary">
                  Import Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!importResult && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-[#6B7280] mx-auto mb-4" />
                    <p className="text-sm text-muted">
                      Select a file and broker to start importing
                    </p>
                  </div>
                )}

                {importResult && (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-[#16A34A]" />
                      ) : (
                        <XCircle className="h-5 w-5 text-[#DC2626]" />
                      )}
                      <Badge 
                        variant={importResult.success ? "default" : "destructive"}
                        className={importResult.success ? "bg-[#16A34A]" : "bg-[#DC2626]"}
                      >
                        {importResult.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-[#F9FAFB] rounded">
                        <div className="text-2xl font-bold text-[#16A34A]">
                          {importResult.successCount}
                        </div>
                        <div className="text-xs text-muted">Imported</div>
                      </div>
                      <div className="text-center p-3 bg-[#F9FAFB] rounded">
                        <div className="text-2xl font-bold text-[#DC2626]">
                          {importResult.errorCount}
                        </div>
                        <div className="text-xs text-muted">Errors</div>
                      </div>
                    </div>

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                          <span className="text-sm font-medium">Errors:</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.errors.slice(0, 5).map((error, index) => (
                            <div key={index} className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2 rounded">
                              {error}
                            </div>
                          ))}
                          {importResult.errors.length > 5 && (
                            <div className="text-xs text-muted">
                              ... and {importResult.errors.length - 5} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {importResult.success && importResult.successCount > 0 && (
                      <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                        <p className="text-sm text-[#16A34A]">
                          Successfully imported {importResult.successCount} trades! 
                          Redirecting to trades page...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Supported Formats */}
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                Supported Formats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {brokerOptions.map(broker => (
                  <div key={broker.value} className="space-y-2">
                    <h4 className="font-medium text-primary">{broker.label}</h4>
                    <div className="text-xs text-muted space-y-1">
                      {broker.value === 'interactive_brokers' && (
                        <>
                          <div>• Required: Date, Symbol, Buy/Sell, Quantity</div>
                          <div>• Optional: Time, Price, Realized P&L</div>
                        </>
                      )}
                      {broker.value === 'td_ameritrade' && (
                        <>
                          <div>• Required: DATE, SYMBOL, SIDE, QTY</div>
                          <div>• Optional: TIME, PRICE, NET AMT</div>
                        </>
                      )}
                      {broker.value === 'generic_csv' && (
                        <>
                          <div>• Required: date, symbol, side, volume</div>
                          <div>• Optional: time, pnl</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}