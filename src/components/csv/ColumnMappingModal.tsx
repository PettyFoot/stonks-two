'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

// Types
interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  reasoning: string;
}

interface AiMappingResult {
  mappings: ColumnMapping[];
  overallConfidence: number;
  requiresUserReview: boolean;
  missingRequired: string[];
  suggestions: string[];
}

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiMappingResult: AiMappingResult;
  originalHeaders: string[];
  sampleData: any[];
  onApplyMappings: (mappings: ColumnMapping[]) => void;
  isProcessing?: boolean;
}

const STANDARD_COLUMNS = [
  { value: 'Date', label: 'Date', required: true },
  { value: 'Time', label: 'Time', required: false },
  { value: 'Symbol', label: 'Symbol', required: true },
  { value: 'Buy/Sell', label: 'Buy/Sell', required: true },
  { value: 'Shares', label: 'Shares', required: true },
  { value: 'Price', label: 'Price', required: false },
  { value: 'Commission', label: 'Commission', required: false },
  { value: 'Fees', label: 'Fees', required: false },
  { value: 'Account', label: 'Account', required: false },
] as const;

export default function ColumnMappingModal({
  isOpen,
  onClose,
  aiMappingResult,
  originalHeaders,
  sampleData,
  onApplyMappings,
  isProcessing = false
}: ColumnMappingModalProps) {
  
  const [userMappings, setUserMappings] = useState<ColumnMapping[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize mappings from AI result
  useEffect(() => {
    if (isOpen && aiMappingResult) {
      setUserMappings([...aiMappingResult.mappings]);
      validateMappings(aiMappingResult.mappings);
    }
  }, [isOpen, aiMappingResult]);

  const validateMappings = (mappings: ColumnMapping[]) => {
    const newErrors: string[] = [];
    const mappedTargets = mappings.map(m => m.targetColumn);
    
    // Check for required columns
    const requiredColumns = STANDARD_COLUMNS.filter(col => col.required).map(col => col.value);
    const missingRequired = requiredColumns.filter(col => !mappedTargets.includes(col));
    
    if (missingRequired.length > 0) {
      newErrors.push(`Missing required columns: ${missingRequired.join(', ')}`);
    }

    // Check for duplicate mappings
    const duplicates = mappedTargets.filter((target, index) => 
      target && mappedTargets.indexOf(target) !== index
    );
    
    if (duplicates.length > 0) {
      newErrors.push(`Duplicate mappings detected: ${duplicates.join(', ')}`);
    }

    setErrors(newErrors);
  };

  const updateMapping = (sourceColumn: string, targetColumn: string) => {
    const newMappings = userMappings.filter(m => m.sourceColumn !== sourceColumn);
    
    if (targetColumn && targetColumn !== 'none') {
      newMappings.push({
        sourceColumn,
        targetColumn,
        confidence: 1.0, // User-set mappings have max confidence
        reasoning: 'User-specified mapping'
      });
    }

    setUserMappings(newMappings);
    validateMappings(newMappings);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-[#16A34A] text-white">High</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-[#F59E0B] text-white">Medium</Badge>;
    } else {
      return <Badge className="bg-[#DC2626] text-white">Low</Badge>;
    }
  };

  const getCurrentMapping = (sourceColumn: string): string => {
    const mapping = userMappings.find(m => m.sourceColumn === sourceColumn);
    return mapping?.targetColumn || 'none';
  };

  const handleApply = () => {
    if (errors.length === 0) {
      onApplyMappings(userMappings);
    }
  };

  const downloadTemplate = () => {
    window.open('/api/csv/template', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
            Column Mapping Required
          </DialogTitle>
          <DialogDescription>
            AI detected a custom CSV format. Please review and correct the column mappings below.
            Red columns indicate low confidence or missing required fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Analysis Summary */}
          <Card className="bg-[#F8FAFC] border-[#E2E8F0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Confidence:</span>
                <div className="flex items-center gap-2">
                  {getConfidenceBadge(aiMappingResult.overallConfidence)}
                  <span className="text-sm text-gray-600">
                    {(aiMappingResult.overallConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {aiMappingResult.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Suggestions:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {aiMappingResult.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {errors.length > 0 && (
            <Card className="bg-[#FEF2F2] border-[#FECACA]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-[#DC2626]" />
                  <span className="text-sm font-medium text-[#DC2626]">Validation Errors</span>
                </div>
                <ul className="text-sm text-[#DC2626] space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Column Mapping Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Column Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {originalHeaders.map((header) => {
                  const aiMapping = aiMappingResult.mappings.find(m => m.sourceColumn === header);
                  const currentMapping = getCurrentMapping(header);
                  const isLowConfidence = aiMapping && aiMapping.confidence < 0.6;
                  
                  return (
                    <div 
                      key={header}
                      className={`p-4 border rounded-lg ${
                        isLowConfidence ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* Source Column */}
                        <div>
                          <p className="text-sm font-medium">{header}</p>
                          <p className="text-xs text-gray-500">
                            Sample: {sampleData[0]?.[header] || 'N/A'}
                          </p>
                        </div>

                        {/* AI Suggestion */}
                        <div>
                          {aiMapping ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{aiMapping.targetColumn}</span>
                                {getConfidenceBadge(aiMapping.confidence)}
                              </div>
                              <p className="text-xs text-gray-500">{aiMapping.reasoning}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No suggestion</span>
                          )}
                        </div>

                        {/* User Selection */}
                        <div>
                          <Select value={currentMapping} onValueChange={(value) => updateMapping(header, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mapping..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (Skip)</SelectItem>
                              {STANDARD_COLUMNS.map((col) => (
                                <SelectItem key={col.value} value={col.value}>
                                  {col.label} {col.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status */}
                        <div className="flex justify-center">
                          {currentMapping === 'none' ? (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          ) : aiMapping && currentMapping === aiMapping.targetColumn ? (
                            <CheckCircle className="h-5 w-5 text-[#16A34A]" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Required Fields Legend */}
          <Card className="bg-[#F0F9FF] border-[#BAE6FD]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-[#0369A1]" />
                <span className="text-sm font-medium text-[#0369A1]">Required Fields</span>
              </div>
              <p className="text-sm text-[#0369A1] mb-2">
                These columns must be mapped for successful import:
              </p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_COLUMNS.filter(col => col.required).map((col) => (
                  <Badge key={col.value} variant="outline" className="text-[#0369A1] border-[#0369A1]">
                    {col.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={errors.length > 0 || isProcessing}
              className="bg-[#16A34A] hover:bg-[#15803d] text-white"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Apply Mappings & Import'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}