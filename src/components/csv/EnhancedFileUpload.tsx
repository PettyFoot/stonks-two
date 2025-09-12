'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  RefreshCw,
  Info,
  Building2,
  Brain
} from 'lucide-react';
import BrokerSelector from '@/components/broker/BrokerSelector';
import MappingReview from '@/components/csv/MappingReview';
// Removed broker formats import - using automatic detection now

// Types
interface DetectedFormatInfo {
  name: string;
  description: string;
  confidence: number;
  reasoning: string[];
  brokerName?: string;
}

interface ValidationResult {
  isValid: boolean;
  isStandardFormat: boolean;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
  errors: string[];
  fileSize: number;
  detectedFormatInfo?: DetectedFormatInfo | null;
}

interface UploadState {
  file: File | null;
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  validationResult: ValidationResult | null;
  uploadResult: Record<string, unknown> | null;
  error: string | null;
}

interface UploadLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  isUnlimited: boolean;
  used: number;
}

interface EnhancedFileUploadProps {
  onUploadComplete?: (result: Record<string, unknown>) => void;
  onMappingRequired?: (result: Record<string, unknown>) => void;
  accountTags?: string[];
  uploadLimitStatus?: UploadLimitStatus | null;
  onRefreshLimits?: () => void;
}

export default function EnhancedFileUpload({ 
  onUploadComplete, 
  onMappingRequired, 
  accountTags = [],
  uploadLimitStatus,
  onRefreshLimits
}: EnhancedFileUploadProps) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<UploadState>({
    file: null,
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    validationResult: null,
    uploadResult: null,
    error: null,
  });

  const [customAccountTags, setCustomAccountTags] = useState('');
  
  // New state for broker selection and mapping review
  const [showBrokerSelector, setShowBrokerSelector] = useState(false);
  const [showMappingReview, setShowMappingReview] = useState(false);
  const [pendingImportBatchId, setPendingImportBatchId] = useState<string | null>(null);
  const [aiMappingResult, setAiMappingResult] = useState<any>(null);
  const [aiIngestCheckId, setAiIngestCheckId] = useState<string | null>(null);

  // New function to clear only the file, keeping status messages
  const clearFileOnly = useCallback(() => {
    console.log('🧹 Clearing file only, keeping status');
    setState(prev => ({ 
      ...prev,
      file: null,
      isDragOver: false,
      isUploading: false,
      uploadProgress: 0,
      validationResult: null,
      error: null
      // Keep uploadResult to show success message
    }));
    setCustomAccountTags('');
    setShowBrokerSelector(false);
    setShowMappingReview(false);
    setPendingImportBatchId(null);
    setAiMappingResult(null);
    setAiIngestCheckId(null);
  }, []);

  const resetState = useCallback(() => {
    console.log('🔄 Resetting EnhancedFileUpload state');
    setState({
      file: null,
      isDragOver: false,
      isUploading: false,
      uploadProgress: 0,
      validationResult: null,
      uploadResult: null,
      error: null,
    });
    setCustomAccountTags('');
    setShowBrokerSelector(false);
    setShowMappingReview(false);
    setPendingImportBatchId(null);
    setAiMappingResult(null);
    setAiIngestCheckId(null);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // File type validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Please select a CSV file. Only CSV files are supported.';
    }

    // File size validation (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 100MB.`;
    }

    return null;
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      file, 
      error: null, 
      validationResult: null, 
      uploadResult: null 
    }));

    // Auto-validate the file
    await validateCsvFile(file);
  }, [validateFile]);

  const validateCsvFile = async (file: File) => {
    try {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 25 }));

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/csv/upload', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      setState(prev => ({ 
        ...prev, 
        validationResult: result, 
        isUploading: false, 
        uploadProgress: 0 
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Validation failed',
        isUploading: false,
        uploadProgress: 0
      }));
    }
  };

  const handleUpload = async () => {
    if (!state.file || !user) return;

    try {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

      const formData = new FormData();
      formData.append('file', state.file);
      
      const allTags = [...accountTags];
      if (customAccountTags.trim()) {
        allTags.push(...customAccountTags.split(',').map(tag => tag.trim()).filter(Boolean));
      }
      
      if (allTags.length > 0) {
        formData.append('accountTags', allTags.join(','));
      }

      // No broker format needed - using automatic detection

      // Simulate progress
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          uploadProgress: Math.min(prev.uploadProgress + 10, 90) 
        }));
      }, 200);

      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setState(prev => ({ 
        ...prev, 
        uploadResult: result, 
        isUploading: false, 
        uploadProgress: 100 
      }));

      // Handle different result types
      console.log('📊 Upload result:', result);
      console.log('🔍 Requires broker selection:', result.requiresBrokerSelection);
      console.log('📝 Requires user review:', result.requiresUserReview);
      
      if (result.requiresBrokerSelection) {
        console.log('🏢 Showing broker selector modal');
        setPendingImportBatchId(result.importBatchId);
        setShowBrokerSelector(true);
      } else if (result.requiresUserReview && result.openAiMappingResult && result.openAiMappingResult.mappings) {
        console.log('🧠 Showing AI mapping review modal');
        console.log('🔍 Upload AI result validation:', {
          hasMappings: !!result.openAiMappingResult.mappings,
          mappingsCount: Object.keys(result.openAiMappingResult.mappings || {}).length,
          hasConfidence: typeof result.openAiMappingResult.overallConfidence === 'number',
          showMappingReview: showMappingReview
        });
        setAiMappingResult(result.openAiMappingResult);
        setPendingImportBatchId(result.importBatchId);
        setAiIngestCheckId(result.aiIngestCheckId || null);
        
        // Force a small delay to ensure state is set properly
        setTimeout(() => {
          console.log('🎯 Setting showMappingReview to true');
          setShowMappingReview(true);
        }, 100);
      } else if (result.success) {
        console.log('✅ Upload completed successfully');
        onUploadComplete?.(result);
        // Refresh upload limits after successful upload
        onRefreshLimits?.();
        // Clear only the file, keep success status message
        setTimeout(() => {
          clearFileOnly();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000); // Wait 2 seconds to show success message before clearing file
      } else {
        // Legacy fallback for other mapping required scenarios
        onMappingRequired?.(result);
      }

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Upload failed',
        isUploading: false,
        uploadProgress: 0
      }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragOver: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragOver: true }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setState(prev => ({ ...prev, isDragOver: false }));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const downloadTemplate = () => {
    // Download standard template
    window.open('/api/csv/template', '_blank');
  };

  // Handle broker selection
  const handleBrokerSelected = async (broker: any, brokerName: string) => {
    console.log(`🏢 Broker selected: ${brokerName} (ID: ${broker.id})`);
    console.log('📄 Processing import batch:', pendingImportBatchId);
    
    setShowBrokerSelector(false);
    
    if (!pendingImportBatchId) {
      console.error('❌ No pending import batch ID');
      setState(prev => ({ ...prev, error: 'Missing import batch ID' }));
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isUploading: true, 
        uploadProgress: 50,
        error: null 
      }));

      console.log('🚀 Calling process-with-broker API...');
      const allTags = [
        ...accountTags,
        ...customAccountTags.split(',').map(tag => tag.trim()).filter(Boolean)
      ];

      const response = await fetch('/api/csv/process-with-broker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importBatchId: pendingImportBatchId,
          brokerName: brokerName,
          accountTags: allTags,
        }),
      });

      const result = await response.json();
      console.log('📊 Process-with-broker result:', result);

      setState(prev => ({ 
        ...prev, 
        uploadResult: result, 
        isUploading: false, 
        uploadProgress: 100 
      }));

      if (!response.ok) {
        throw new Error(result.error || 'Processing failed');
      }

      // Check if we need mapping review
      if (result.requiresUserReview && result.openAiMappingResult && result.openAiMappingResult.mappings) {
        console.log('🧠 AI mapping needs review, showing mapping review modal');
        console.log('🔍 AI result validation:', {
          hasMappings: !!result.openAiMappingResult.mappings,
          mappingsCount: Object.keys(result.openAiMappingResult.mappings || {}).length,
          hasConfidence: typeof result.openAiMappingResult.overallConfidence === 'number',
          showMappingReview: showMappingReview
        });
        setAiMappingResult(result.openAiMappingResult);
        setAiIngestCheckId(result.aiIngestCheckId || null);
        
        // Force a small delay to ensure state is set properly
        setTimeout(() => {
          console.log('🎯 Setting showMappingReview to true from broker selection');
          setShowMappingReview(true);
        }, 100);
      } else if (result.success) {
        console.log('✅ Processing completed successfully');
        onUploadComplete?.(result);
        // Refresh upload limits after successful processing
        onRefreshLimits?.();
        // Clear only the file, keep success status message
        setTimeout(() => {
          clearFileOnly();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      }

    } catch (error) {
      console.error('💥 Process with broker error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Processing failed',
        isUploading: false,
        uploadProgress: 0
      }));
    }
  };

  // Handle creating new broker
  const handleCreateBroker = async (brokerName: string) => {
    console.log(`➕ Creating new broker: ${brokerName}`);
    
    try {
      const response = await fetch('/api/brokers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: brokerName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create broker');
      }

      const result = await response.json();
      console.log('✅ Created broker:', result.broker);
      
      // Now select this broker
      handleBrokerSelected(result.broker, brokerName);
      
    } catch (error) {
      console.error('💥 Create broker error:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Failed to create broker' }));
    }
  };

  // Handle mapping review approval
  const handleMappingApproved = async (correctedMappings?: { [csvHeader: string]: string }) => {
    console.log('✅ Mapping approved');
    if (correctedMappings) {
      console.log('🔧 User made corrections:', correctedMappings);
      // TODO: Apply corrections and reprocess
      // For now, just proceed with original mappings
    }
    
    setShowMappingReview(false);
    
    // The result should already be in uploadResult, just trigger the callback
    if (state.uploadResult) {
      onUploadComplete?.(state.uploadResult);
      // Refresh upload limits after successful completion
      onRefreshLimits?.();
      // Clear only the file, keep success status message
      setTimeout(() => {
        clearFileOnly();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-gradient-to-r from-theme-tertiary/10 to-theme-tertiary/5 border-theme-tertiary/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Info className="h-6 w-6 text-theme-tertiary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-theme-tertiary mb-2">Trade Import</h3>
              <ul className="text-sm text-theme-tertiary space-y-1">
                <li>• <strong>Intelligent Detection:</strong> Automatically recognizes broker formats</li>
                <li>• <strong>Custom Format:</strong> AI will help map unknown columns automatically</li>
                <li>• <strong>Account Tags:</strong> Add tags to organize trades by account or strategy</li>
                <li>• <strong>Standard Format:</strong> Use our template for instant processing</li>
              </ul>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="text-theme-tertiary border-theme-tertiary hover:bg-theme-tertiary hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Standard Template
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section - Conditionally show limit reached message */}
        <Card className="bg-theme-surface border-theme-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-theme-primary-text">
              Upload CSV File
            </CardTitle>
          </CardHeader>
          {/* Show limit reached message if user has no remaining uploads */}
          {uploadLimitStatus && !uploadLimitStatus.isUnlimited && uploadLimitStatus.remaining === 0 ? (
            <CardContent className="space-y-6">
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-red/10 border-2 border-theme-red/30 rounded-full mb-4">
                    <AlertTriangle className="h-8 w-8 text-theme-red" />
                  </div>
                  <h3 className="text-lg font-semibold text-theme-red mb-2">Upload Limit Reached</h3>
                  <p className="text-theme-secondary-text">
                    Free tier limit: <span className="font-medium text-theme-red">{uploadLimitStatus.used}/{uploadLimitStatus.limit} uploads used</span>
                  </p>
                </div>
                
                <div className="space-y-4">
                  <p className="text-theme-primary-text">
                    Upgrade to Premium to get unlimited daily uploads!
                  </p>
                  
                  <Button 
                    onClick={() => window.location.href = '/settings?tab=subscription'}
                    className="bg-theme-tertiary hover:bg-theme-tertiary/90 text-white px-8 py-3 text-lg font-medium"
                  >
                    Upgrade to Premium
                  </Button>
                  
                  <p className="text-xs text-theme-secondary-text">
                    Uploads reset daily at midnight
                  </p>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-6">
            {/* Format Detection Status */}
            {state.validationResult?.detectedFormatInfo && (
              <div className="p-4 bg-theme-tertiary/10 border border-theme-tertiary/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-theme-green" />
                  <h4 className="font-medium text-theme-primary-text">Format Detected</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-theme-primary-text">
                      {state.validationResult.detectedFormatInfo.name}
                    </span>
                    <Badge 
                      variant={state.validationResult.detectedFormatInfo.confidence >= 0.8 ? "default" : "secondary"}
                      className={state.validationResult.detectedFormatInfo.confidence >= 0.8 ? "bg-theme-green" : "bg-theme-surface"}
                    >
                      {Math.round(state.validationResult.detectedFormatInfo.confidence * 100)}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-theme-secondary-text">
                    {state.validationResult.detectedFormatInfo.description}
                  </p>
                  {state.validationResult.detectedFormatInfo.brokerName && (
                    <p className="text-xs text-theme-primary-text font-medium">
                      Broker: {state.validationResult.detectedFormatInfo.brokerName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Account Tags Input */}
            <div>
              <label className="block text-sm font-medium text-theme-primary-text mb-2">
                Account Tags (Optional)
              </label>
              <input
                type="text"
                value={customAccountTags}
                onChange={(e) => setCustomAccountTags(e.target.value)}
                placeholder="Enter tags separated by commas (e.g., main-account, live-trading)"
                disabled={state.isUploading}
                className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-theme-tertiary focus:border-transparent disabled:opacity-50 bg-white text-theme-primary-text"
              />
              <p className="text-xs text-theme-secondary-text mt-1">
                Tags will be applied to all trades in this import
              </p>
            </div>

            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-theme-primary-text mb-2">
                CSV File
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  state.isUploading
                    ? 'border-theme-border bg-theme-surface opacity-50'
                    : state.isDragOver 
                      ? 'border-theme-tertiary bg-theme-tertiary/10' 
                      : 'border-theme-border hover:border-theme-tertiary'
                }`}
                onDrop={state.isUploading ? undefined : handleDrop}
                onDragOver={state.isUploading ? undefined : handleDragOver}
                onDragLeave={state.isUploading ? undefined : handleDragLeave}
              >
                {state.isUploading ? (
                  <div className="space-y-4">
                    <RefreshCw className="h-12 w-12 text-theme-tertiary mx-auto animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-theme-primary-text">
                        {state.uploadProgress < 50 ? 'Validating...' : 'Processing...'}
                      </p>
                      <Progress value={state.uploadProgress} className="w-full mt-2" />
                    </div>
                  </div>
                ) : state.file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-theme-green" />
                      <p className="text-sm font-medium text-theme-primary-text">{state.file.name}</p>
                    </div>
                    <p className="text-xs text-theme-secondary-text">
                      {(state.file.size / 1024).toFixed(1)} KB
                    </p>
                    {state.validationResult && (
                      <div className="mt-2 space-y-2">
                        <Badge variant={state.validationResult.detectedFormatInfo ? "outline" : "secondary"} className="bg-white">
                          {state.validationResult.detectedFormatInfo?.brokerName || 
                           (state.validationResult.isStandardFormat ? "Standard Format" : "Custom Format")}
                        </Badge>
                        {state.validationResult.detectedFormatInfo && (
                          <p className="text-xs text-theme-green">
                            ✓ {state.validationResult.detectedFormatInfo.name}
                          </p>
                        )}
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { resetState(); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-xs mt-2"
                    >
                      Remove file
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-theme-secondary-text mx-auto mb-4" />
                    <p className="text-sm text-theme-primary-text mb-2">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-input"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <Button 
              onClick={handleUpload}
              disabled={!state.file || state.isUploading || !state.validationResult?.isValid}
              className="w-full bg-theme-green hover:bg-theme-green/90 text-white"
            >
              {state.isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
          )}
        </Card>

        {/* Status Section */}
        <Card className="bg-theme-surface border-theme-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-theme-primary-text">
              Import Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Error/Success Messages Area - Primary Location */}
            {state.error && (
              <div className="p-4 bg-theme-red/10 border border-theme-red/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <XCircle className="h-5 w-5 text-theme-red flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-theme-red">Error</p>
                    <p className="text-sm text-theme-red mt-1">{state.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {state.validationResult?.errors && state.validationResult.errors.length > 0 && (
              <div className="p-4 bg-theme-red/10 border border-theme-red/30 rounded-lg max-h-48 overflow-y-auto">
                <div className="flex items-start space-x-2">
                  <XCircle className="h-5 w-5 text-theme-red flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-theme-red mb-2">Validation Errors:</p>
                    <ul className="text-xs text-theme-red space-y-1">
                      {state.validationResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {state.validationResult.errors.length > 10 && (
                        <li className="font-medium">... and {state.validationResult.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {state.validationResult && !state.error && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-theme-green" />
                  <Badge 
                    variant="default" 
                    className={state.validationResult.errors?.length > 0 ? "bg-theme-red" : "bg-theme-green"}
                  >
                    {state.validationResult.errors?.length > 0 ? 'Validation Failed' : 'Validated'}
                  </Badge>
                </div>

                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-theme-primary-text">Format:</span>
                    <span className={state.validationResult.detectedFormatInfo ? "text-theme-primary-text" : "text-theme-warning"}>
                      {state.validationResult.detectedFormatInfo?.name || 
                       (state.validationResult.isStandardFormat ? "Standard" : "Custom")}
                    </span>
                  </div>
                  {state.validationResult.detectedFormatInfo?.brokerName && (
                    <div className="flex justify-between">
                      <span className="text-theme-primary-text">Broker:</span>
                      <span className="text-theme-primary-text font-medium">
                        {state.validationResult.detectedFormatInfo.brokerName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Rows:</span>
                    <span>{state.validationResult.rowCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{(state.validationResult.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>

                {!state.validationResult.isStandardFormat && !state.validationResult.detectedFormatInfo && (
                  <div className="p-3 bg-theme-warning/10 border border-theme-warning/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-theme-warning" />
                      <p className="text-sm font-medium text-theme-warning">Unknown Format Detected</p>
                    </div>
                    <p className="text-xs text-theme-warning mt-1">
                      AI will attempt to map your columns automatically. You may need to review the mapping.
                    </p>
                  </div>
                )}
              </div>
            )}

            {state.uploadResult && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {state.uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 text-theme-green" />
                  ) : (
                    <XCircle className="h-5 w-5 text-theme-red" />
                  )}
                  <Badge variant={state.uploadResult.success ? "default" : "destructive"}>
                    {state.uploadResult.success ? 'Success' : 'Needs Review'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-theme-surface rounded">
                    <div className="text-2xl font-bold text-theme-green">
                      {String(state.uploadResult.successCount || 0)}
                    </div>
                    <div className="text-xs text-theme-secondary-text">Imported</div>
                  </div>
                  <div className="text-center p-3 bg-theme-surface rounded">
                    <div className="text-2xl font-bold text-theme-red">
                      {String(state.uploadResult.errorCount || 0)}
                    </div>
                    <div className="text-xs text-theme-secondary-text">Errors</div>
                  </div>
                </div>

                {Boolean(state.uploadResult.requiresUserReview) && (
                  <div className="p-3 bg-theme-warning/10 border border-theme-warning/30 rounded-lg">
                    <p className="text-sm font-medium text-theme-warning">Review Required</p>
                    <p className="text-xs text-theme-warning mt-1">
                      Column mapping needs your attention before import can proceed.
                    </p>
                  </div>
                )}

                {Array.isArray(state.uploadResult.errors) && state.uploadResult.errors.length > 0 && (
                  <div className="p-4 bg-theme-red/10 border border-theme-red/30 rounded-lg max-h-48 overflow-y-auto">
                    <div className="flex items-start space-x-2 mb-2">
                      <XCircle className="h-5 w-5 text-theme-red flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-theme-red mb-2">Import Errors:</p>
                        <ul className="text-xs text-theme-red space-y-1">
                          {state.uploadResult.errors.slice(0, 10).map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                          {state.uploadResult.errors.length > 10 && (
                            <li className="font-medium">... and {state.uploadResult.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {Boolean(state.uploadResult.success && state.uploadResult.message) && (
                  <div className="p-4 bg-theme-green/10 border border-theme-green/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-theme-green flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-theme-green mb-1">Success!</p>
                        <p className="text-xs text-theme-green">{String(state.uploadResult.message)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!state.file && !state.error && !state.isUploading && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-theme-secondary-text mx-auto mb-4" />
                <p className="text-sm text-theme-secondary-text">
                  Select a CSV file to begin validation and import
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Broker Selection Modal */}
      <BrokerSelector
        isOpen={showBrokerSelector}
        onClose={() => {
          console.log('❌ Broker selector cancelled');
          setShowBrokerSelector(false);
          setPendingImportBatchId(null);
        }}
        onSelectBroker={handleBrokerSelected}
        onCreateBroker={handleCreateBroker}
        importBatchId={pendingImportBatchId || undefined}
        fileName={state.file?.name}
      />

      {/* Mapping Review Modal */}
      <MappingReview
        isOpen={showMappingReview}
        onClose={() => {
          console.log('❌ Mapping review cancelled');
          setShowMappingReview(false);
          setAiMappingResult(null);
        }}
        onApproveMapping={handleMappingApproved}
        aiResult={aiMappingResult}
        sampleData={state.validationResult?.sampleRows}
        fileName={state.file?.name}
        brokerName={String(state.uploadResult?.brokerFormatUsed || 'Unknown')}
        aiIngestCheckId={aiIngestCheckId || undefined}
        importBatchId={pendingImportBatchId || undefined}
      />
    </div>
  );
}