'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Info,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
// Import Order fields from the OpenAI service
const ORDER_FIELDS = {
  // Critical fields (must be mapped for valid trades)
  symbol: 'Stock ticker symbol (e.g., AAPL, MSFT)',
  side: 'Buy or Sell action (BUY/SELL)',
  orderQuantity: 'Number of shares or contracts',
  orderPlacedTime: 'When the order was placed/submitted',
  orderExecutedTime: 'When the order was executed/filled',
  
  // Important fields (highly recommended for mapping)
  limitPrice: 'Limit order price per share',
  orderType: 'Order type (MARKET, LIMIT, STOP, STOP_LIMIT)',
  orderStatus: 'Order status (FILLED, CANCELLED, PENDING, REJECTED)',
  orderId: 'Broker-assigned order identifier',
  
  // Optional but useful fields
  parentOrderId: 'Parent order ID for multi-leg strategies',
  timeInForce: 'Time in force (DAY, GTC, IOC, FOK)',
  stopPrice: 'Stop price for stop orders',
  orderUpdatedTime: 'Last time order was modified',
  orderCancelledTime: 'When order was cancelled',
  accountId: 'Broker account identifier/number',
  orderAccount: 'Account name or description',
  orderRoute: 'Order routing destination (ARCA, NASDAQ, etc.)',
  tags: 'User-defined tags or categories',
  tradeId: 'Associated trade group identifier'
} as const;

interface MappingResult {
  field: string;
  confidence: number;
  reasoning?: string;
}

interface OpenAiMappingResult {
  mappings: {
    [csvHeader: string]: MappingResult;
  };
  overallConfidence: number;
  unmappedFields: string[];
  brokerMetadataFields: string[];
  suggestions: string[];
}

interface MappingReviewProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveMapping: (result?: Record<string, unknown> | { [csvHeader: string]: string }) => void;
  aiResult: OpenAiMappingResult;
  sampleData?: Record<string, unknown>[];
  fileName?: string;
  brokerName?: string;
  aiIngestCheckId?: string;
  importBatchId?: string;
}

interface CorrectedMapping {
  [csvHeader: string]: string;
}

interface MarkedForUpdate {
  [csvHeader: string]: boolean;
}

export default function MappingReview({
  isOpen,
  onClose,
  onApproveMapping,
  aiResult,
  sampleData = [],
  fileName,
  brokerName,
  aiIngestCheckId: _aiIngestCheckId,
  importBatchId
}: MappingReviewProps) {
  const [correctedMappings, setCorrectedMappings] = useState<CorrectedMapping>({});
  const [markedForUpdate, setMarkedForUpdate] = useState<MarkedForUpdate>({});
  const [showSampleData, setShowSampleData] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Utility function to wrap fetch with timeout
  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit, timeoutMs = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds. Please try again or contact support if the issue persists.');
      }
      throw error;
    }
  }, []);

  // Auto-submit handler for back button/ESC key - defined before use in useEffect
  const handleAutoSubmit = useCallback(async () => {
    if (isProcessing || isAutoSubmitting) return;

    setIsAutoSubmitting(true);
    setErrorMessage(null);

    try {
      // Use current AI mappings without any user corrections
      const response = await fetchWithTimeout('/api/csv/finalize-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importBatchId,
          userApproved: true,
          reportError: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to finalize mappings');
      }

      // Call the original callback with the result
      onApproveMapping(result);
    } catch (error) {
      console.error('💥 Auto-submit failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process import';
      setErrorMessage(errorMsg);
      // Don't close the dialog - let user see the error and retry
    } finally {
      setIsAutoSubmitting(false);
    }
  }, [isProcessing, isAutoSubmitting, importBatchId, onApproveMapping, fetchWithTimeout]);

  // Handle browser back button - auto-submit when user tries to navigate away
  useEffect(() => {
    if (!isOpen) return;

    // Add a dummy history entry when modal opens
    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // Prevent default back navigation
      event.preventDefault();
      // Auto-submit current AI mappings
      handleAutoSubmit();
    };

    // Prevent ESC key from closing modal
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {

        event.preventDefault();
        event.stopPropagation();
        handleAutoSubmit();
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleAutoSubmit]);

  // Handle any close attempts by auto-submitting instead
  const handleCloseAttempt = useCallback(() => {
    handleAutoSubmit();
  }, [handleAutoSubmit]);

  // Early return if aiResult is not available
  if (!aiResult || !aiResult.mappings) {
    console.warn('⚠️ MappingReview: aiResult is null or missing mappings');
    console.warn('📋 aiResult:', aiResult);
    if (isOpen) {
      console.warn('❗ Modal should be open but aiResult is missing!');
    }
    return null;
  }

  const csvHeaders = Object.keys(aiResult.mappings);
  const availableFields = Object.keys(ORDER_FIELDS);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (confidence >= 0.5) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const handleMarkForUpdate = (csvHeader: string, checked: boolean) => {
    setMarkedForUpdate(prev => ({
      ...prev,
      [csvHeader]: checked
    }));

    // If unmarking, also clear any correction for this field
    if (!checked) {
      setCorrectedMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings[csvHeader];
        return newMappings;
      });
    }
  };

  const handleFieldChange = (csvHeader: string, newField: string) => {

    setCorrectedMappings(prev => ({
      ...prev,
      [csvHeader]: newField
    }));
  };

  const handleResetMapping = (csvHeader: string) => {
    setCorrectedMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[csvHeader];
      return newMappings;
    });
    setMarkedForUpdate(prev => ({
      ...prev,
      [csvHeader]: false
    }));
  };

  const handleReportError = async () => {
    if (!importBatchId) {
      console.error('❌ Missing importBatchId, cannot report error');
      setErrorMessage('Missing import batch ID. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetchWithTimeout('/api/csv/finalize-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importBatchId,
          userApproved: false,
          reportError: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to report error');
      }

      // Close the dialog and notify parent
      onClose();

    } catch (error) {
      console.error('💥 Failed to report error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to report error';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseAsIs = async () => {
    if (!importBatchId) {
      console.error('❌ Missing importBatchId, cannot finalize mappings');
      setErrorMessage('Missing import batch ID. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetchWithTimeout('/api/csv/finalize-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importBatchId,
          userApproved: true,
          reportError: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to finalize mappings');
      }

      // Call the original callback with the result
      onApproveMapping(result);

    } catch (error) {
      console.error('💥 Failed to finalize mappings:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process import';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if any rows are marked for update
  const hasMarkedItems = Object.values(markedForUpdate).some(marked => marked);

  const handleApprove = async () => {
    // Only include corrections for fields that are marked for update AND have a selected value
    const actualCorrections: CorrectedMapping = {};
    Object.entries(correctedMappings).forEach(([csvHeader, value]) => {
      if (markedForUpdate[csvHeader] && value) {
        actualCorrections[csvHeader] = value;
      }
    });

    if (!importBatchId) {
      console.error('❌ Missing importBatchId, cannot finalize mappings');
      setErrorMessage('Missing import batch ID. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetchWithTimeout('/api/csv/finalize-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importBatchId,
          correctedMappings: Object.keys(actualCorrections).length > 0 ? actualCorrections : undefined,
          userApproved: true,
          reportError: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to finalize mappings');
      }

      // Call the original callback with the finalized result
      onApproveMapping(result);

    } catch (error) {
      console.error('💥 Failed to finalize mappings:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process import';
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentMapping = (csvHeader: string): string => {
    // Only return a value if the user has explicitly set one
    return correctedMappings[csvHeader] || '';
  };

  const getAiSuggestedField = (csvHeader: string): string => {
    return aiResult.mappings[csvHeader]?.field || 'brokerMetadata';
  };

  const getSampleValue = (csvHeader: string): string => {
    if (sampleData.length === 0) return '';
    const value = sampleData[0][csvHeader];
    return value ? String(value).substring(0, 50) : '';
  };

  
  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent className="!w-[80vw] md:!w-[65vw] !max-w-none sm:!max-w-none max-h-[90vh] flex flex-col z-[60] bg-white dark:bg-gray-900 overflow-hidden [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Review AI Mapping Results
          </DialogTitle>
          <DialogDescription>
            {fileName && (
              <span className="block text-sm text-muted-foreground mb-2">
                File: <code className="bg-muted px-1 rounded">{fileName}</code>
                {brokerName && <> • Broker: <strong>{brokerName}</strong></>}
              </span>
            )}
            AI confidence is {(aiResult.overallConfidence * 100).toFixed(1)}%. Please review and correct the mappings below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Overall Stats */}
          <div className="grid grid-cols-4 gap-4 flex-shrink-0">
            <Card className="bg-white dark:bg-gray-900">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-blue-600">{csvHeaders.length}</div>
                <p className="text-xs text-muted-foreground">Total Headers</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-900">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(aiResult.mappings || {}).filter(m => m?.confidence >= 0.8).length}
                </div>
                <p className="text-xs text-muted-foreground">High Confidence</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-900">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(aiResult.mappings || {}).filter(m => m?.confidence >= 0.5 && m?.confidence < 0.8).length}
                </div>
                <p className="text-xs text-muted-foreground">Medium Confidence</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-900">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(aiResult.mappings || {}).filter(m => m?.confidence < 0.5).length}
                </div>
                <p className="text-xs text-muted-foreground">Low Confidence</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions - Collapsible */}
          {aiResult.suggestions && aiResult.suggestions.length > 0 && (
            <Card className="bg-white dark:bg-gray-900 flex-shrink-0">
              <CardHeader className="pb-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    AI Suggestions ({aiResult.suggestions.length})
                  </CardTitle>
                  {showSuggestions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showSuggestions && (
                <CardContent className="pt-0">
                  <ul className="text-sm space-y-1">
                    {aiResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {/* Column Mappings - Redesigned */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 rounded-lg border">
            {/* Section Header */}
            <div className="flex justify-between items-center p-4 border-b bg-muted/30">
              <div>
                <h3 className="text-lg font-semibold">Column Mappings</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and correct the AI field mappings below. Use the dropdowns to change incorrect mappings.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSampleData(!showSampleData)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {showSampleData ? 'Hide' : 'Show'} Sample Data
              </Button>
            </div>
            
            {/* Fixed Table Headers - Hidden on mobile */}
            <div className="hidden md:block px-4 py-3 bg-muted/20 border-b">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                <div>CSV Column</div>
                <div>AI Confidence</div>
                <div>AI Suggested Field</div>
                <div>Mark for Update</div>
                <div>Suggested Field</div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-[400px] overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {csvHeaders.map((csvHeader) => {
                    const mapping = aiResult.mappings[csvHeader];
                    const currentField = getCurrentMapping(csvHeader);
                    const aiSuggestedField = getAiSuggestedField(csvHeader);
                    const sampleValue = getSampleValue(csvHeader);
                    const isMarkedForUpdate = markedForUpdate[csvHeader] || false;
                    const isModified = correctedMappings[csvHeader] !== undefined;

                    return (
                      <div key={csvHeader} className={`rounded-lg border transition-all ${
                        isModified 
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}>
                        
                        {/* Mobile Layout */}
                        <div className="md:hidden p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-base text-gray-900 dark:text-gray-100">{csvHeader}</div>
                              {showSampleData && sampleValue && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Sample: "{sampleValue}"
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getConfidenceIcon(mapping.confidence)}
                              <Badge
                                variant={mapping.confidence >= 0.8 ? 'default' : mapping.confidence >= 0.5 ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {getConfidenceLabel(mapping.confidence)} {(mapping.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Suggested:</div>
                              <div>
                                {aiSuggestedField === 'brokerMetadata' ? (
                                  <Badge variant="outline" className="text-sm">Metadata</Badge>
                                ) : (
                                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {aiSuggestedField}
                                  </code>
                                )}
                              </div>
                              {mapping.reasoning && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  {mapping.reasoning}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 pb-2">
                              <Checkbox
                                id={`mark-${csvHeader}`}
                                checked={isMarkedForUpdate}
                                onCheckedChange={(checked) => handleMarkForUpdate(csvHeader, checked as boolean)}
                              />
                              <label
                                htmlFor={`mark-${csvHeader}`}
                                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                              >
                                Mark for update
                              </label>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested Field:</div>
                              <Select
                                value={currentField}
                                onValueChange={(value) => handleFieldChange(csvHeader, value)}
                                disabled={!isMarkedForUpdate}
                              >
                                <SelectTrigger className={`h-10 text-sm border hover:border-blue-300 focus:border-blue-500 ${
                                  !isMarkedForUpdate ? 'opacity-50 cursor-not-allowed' : ''
                                }`}>
                                  <SelectValue placeholder="Select a field..." />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                  <SelectItem value="brokerMetadata">
                                    <Badge variant="outline">Store as Metadata</Badge>
                                  </SelectItem>
                                  {availableFields.map((field) => {
                                    const getShortDescription = (fieldName: string) => {
                                      switch(fieldName) {
                                        case 'symbol': return 'Ticker symbol';
                                        case 'side': return 'Buy/Sell';
                                        case 'orderQuantity': return 'Share quantity';
                                        case 'orderPlacedTime': return 'Placed time';
                                        case 'orderExecutedTime': return 'Execution time';
                                        case 'limitPrice': return 'Limit price';
                                        case 'orderType': return 'Order type';
                                        case 'orderStatus': return 'Order status';
                                        case 'orderId': return 'Order ID';
                                        case 'parentOrderId': return 'Parent order';
                                        case 'timeInForce': return 'Time in force';
                                        case 'stopPrice': return 'Stop price';
                                        case 'orderUpdatedTime': return 'Update time';
                                        case 'orderCancelledTime': return 'Cancel time';
                                        case 'accountId': return 'Account ID';
                                        case 'orderAccount': return 'Account name';
                                        case 'orderRoute': return 'Order route';
                                        case 'tags': return 'Tags';
                                        case 'tradeId': return 'Trade ID';
                                        default: return '';
                                      }
                                    };

                                    return (
                                      <SelectItem key={field} value={field}>
                                        <div className="flex flex-col items-start">
                                          <code className="text-sm font-medium">{field}</code>
                                          <span className="text-xs text-muted-foreground">
                                            {getShortDescription(field)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {isModified && (
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-1">
                                  <Edit3 className="h-3 w-3 text-blue-500" />
                                  <span className="text-sm text-blue-600 font-medium">Modified</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetMapping(csvHeader)}
                                  className="h-7 text-xs"
                                >
                                  Reset
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:grid md:grid-cols-5 gap-4 items-start p-5">
                          {/* CSV Column */}
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{csvHeader}</div>
                            {showSampleData && sampleValue && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                Sample: "{sampleValue}"
                              </div>
                            )}
                          </div>

                          {/* AI Confidence */}
                          <div className="flex items-center gap-2">
                            {getConfidenceIcon(mapping.confidence)}
                            <div className="flex flex-col">
                              <Badge
                                variant={mapping.confidence >= 0.8 ? 'default' : mapping.confidence >= 0.5 ? 'secondary' : 'destructive'}
                                className="text-xs w-fit"
                              >
                                {getConfidenceLabel(mapping.confidence)}
                              </Badge>
                              <span className={`text-xs ${getConfidenceColor(mapping.confidence)} mt-1`}>
                                {(mapping.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {/* AI Suggested Field */}
                          <div>
                            <div className="text-sm">
                              {aiSuggestedField === 'brokerMetadata' ? (
                                <Badge variant="outline" className="text-xs">Metadata</Badge>
                              ) : (
                                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {aiSuggestedField}
                                </code>
                              )}
                            </div>
                            {mapping.reasoning && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {mapping.reasoning}
                              </div>
                            )}
                          </div>

                          {/* Mark for Update Checkbox */}
                          <div className="flex items-center justify-center">
                            <Checkbox
                              id={`mark-${csvHeader}-desktop`}
                              checked={isMarkedForUpdate}
                              onCheckedChange={(checked) => handleMarkForUpdate(csvHeader, checked as boolean)}
                            />
                          </div>

                          {/* Suggested Field Selector */}
                          <div>
                            <Select
                              value={currentField}
                              onValueChange={(value) => handleFieldChange(csvHeader, value)}
                              disabled={!isMarkedForUpdate}
                            >
                              <SelectTrigger className={`h-9 text-sm border hover:border-blue-300 focus:border-blue-500 ${
                                !isMarkedForUpdate ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                                <SelectValue placeholder="Select a field..." />
                              </SelectTrigger>
                              <SelectContent className="z-[100]">
                                <SelectItem value="brokerMetadata">
                                  <Badge variant="outline">Store as Metadata</Badge>
                                </SelectItem>
                                {availableFields.map((field) => {
                                  const getShortDescription = (fieldName: string) => {
                                    switch(fieldName) {
                                      case 'symbol': return 'Ticker symbol';
                                      case 'side': return 'Buy/Sell';
                                      case 'orderQuantity': return 'Share quantity';
                                      case 'orderPlacedTime': return 'Placed time';
                                      case 'orderExecutedTime': return 'Execution time';
                                      case 'limitPrice': return 'Limit price';
                                      case 'orderType': return 'Order type';
                                      case 'orderStatus': return 'Order status';
                                      case 'orderId': return 'Order ID';
                                      case 'parentOrderId': return 'Parent order';
                                      case 'timeInForce': return 'Time in force';
                                      case 'stopPrice': return 'Stop price';
                                      case 'orderUpdatedTime': return 'Update time';
                                      case 'orderCancelledTime': return 'Cancel time';
                                      case 'accountId': return 'Account ID';
                                      case 'orderAccount': return 'Account name';
                                      case 'orderRoute': return 'Order route';
                                      case 'tags': return 'Tags';
                                      case 'tradeId': return 'Trade ID';
                                      default: return '';
                                    }
                                  };

                                  return (
                                    <SelectItem key={field} value={field}>
                                      <div className="flex flex-col items-start">
                                        <code className="text-xs font-medium">{field}</code>
                                        <span className="text-xs text-muted-foreground">
                                          {getShortDescription(field)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {(isMarkedForUpdate || isModified) && (
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <Edit3 className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-blue-600 font-medium">
                                    {isModified ? 'Modified' : 'Marked for update'}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetMapping(csvHeader)}
                                  className="h-6 text-xs px-2"
                                >
                                  Reset
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        )}

        {/* Action Buttons - No Cancel Option */}
        <div className="flex justify-between pt-4 flex-shrink-0 border-t bg-white dark:bg-gray-900">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReportError}
              disabled={isProcessing || isAutoSubmitting}
            >
              Report Mapping Error
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleUseAsIs}
              disabled={isProcessing || isAutoSubmitting}
            >
              {isProcessing || isAutoSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isAutoSubmitting ? 'Applying AI Mappings...' : 'Processing...'}
                </>
              ) : (
                'Use AI Mappings As-Is'
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing || isAutoSubmitting || !hasMarkedItems}
              title={!hasMarkedItems ? "Please mark at least one row for update to apply corrections" : ""}
            >
              {isProcessing || isAutoSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isAutoSubmitting ? 'Applying AI Mappings...' : 'Processing...'}
                </>
              ) : (
                <>
                  Apply Corrections & Import
                  {Object.keys(correctedMappings).filter(key => markedForUpdate[key] && correctedMappings[key]).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.keys(correctedMappings).filter(key => markedForUpdate[key] && correctedMappings[key]).length} corrections
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}