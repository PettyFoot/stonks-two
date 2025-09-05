'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import EnhancedFileUpload from '@/components/csv/EnhancedFileUpload';
import ColumnMappingModal from '@/components/csv/ColumnMappingModal';
import BrokerList from '@/components/broker/BrokerList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CheckCircle, 
  Download,
  BookOpen,
  Brain,
  Shield,
  TrendingUp,
  Building2,
  Upload,
  Workflow
} from 'lucide-react';
import Link from 'next/link';

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

interface MappingModalState {
  isOpen: boolean;
  aiMappingResult: AiMappingResult | null;
  originalHeaders: string[];
  sampleData: Record<string, unknown>[];
  importBatchId: string | null;
}

export default function EnhancedImportPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  
  const [mappingModal, setMappingModal] = useState<MappingModalState>({
    isOpen: false,
    aiMappingResult: null,
    originalHeaders: [],
    sampleData: [],
    importBatchId: null,
  });
  
  const [isProcessingMapping, setIsProcessingMapping] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--theme-tertiary)] mx-auto mb-4"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleUploadComplete = (result: Record<string, unknown>) => {
    console.log('Upload completed:', result);
    
    // Stay on the import page - no redirect
    // The EnhancedFileUpload component will show success message
  };

  const handleMappingRequired = (result: Record<string, unknown>) => {
    console.log('Mapping required:', result);
    
    setMappingModal({
      isOpen: true,
      aiMappingResult: result.aiMappingResult as AiMappingResult | null,
      originalHeaders: (result.aiMappingResult as { mappings?: Array<{ sourceColumn: string }> })?.mappings?.map((m: { sourceColumn: string }) => m.sourceColumn) || [],
      sampleData: [], // Would need to be passed from the upload component
      importBatchId: result.importBatchId as string | null,
    });
  };

  const handleApplyMappings = async (mappings: ColumnMapping[]) => {
    if (!mappingModal.importBatchId) return;

    setIsProcessingMapping(true);
    
    try {
      const response = await fetch('/api/csv/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importBatchId: mappingModal.importBatchId,
          mappings,
          accountTags: [], // Could be passed from the upload component
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply mappings');
      }

      // Close modal and show success
      setMappingModal(prev => ({ ...prev, isOpen: false }));
      handleUploadComplete(result);

    } catch (error) {
      console.error('Mapping application failed:', error);
      // Could show error toast here
    } finally {
      setIsProcessingMapping(false);
    }
  };

  const closeMappingModal = () => {
    setMappingModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Enhanced CSV Import" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-tertiary/10 rounded-full">
                <Workflow className="h-8 w-8 text-[var(--theme-tertiary)]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Trade Data Import</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Import your trading data either by connecting your broker directly or uploading CSV files 
              with AI-powered column mapping and real-time validation.
            </p>
          </div>

          {/* Import Methods Tabs */}
          <Tabs defaultValue="broker" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="broker" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Connect Broker
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
            </TabsList>

            {/* Broker Connection Tab */}
            <TabsContent value="broker" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-tertiary/10 to-tertiary/20 border-tertiary/30">
                  <CardContent className="p-6 text-center">
                    <Building2 className="h-12 w-12 text-[var(--theme-tertiary)] mx-auto mb-4" />
                    <h3 className="font-semibold text-tertiary mb-2">Direct Broker Connection</h3>
                    <p className="text-sm text-tertiary">
                      Connect your broker account directly for automatic trade synchronization.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-positive/10 to-positive/20 border-positive/30">
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 text-[var(--theme-green)] mx-auto mb-4" />
                    <h3 className="font-semibold text-positive mb-2">Secure OAuth</h3>
                    <p className="text-sm text-positive">
                      Bank-level security with encrypted connections and no stored credentials.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-warning/10 to-warning/20 border-warning/30">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-12 w-12 text-[var(--theme-tertiary)] mx-auto mb-4" />
                    <h3 className="font-semibold text-warning mb-2">Real-time Sync</h3>
                    <p className="text-sm text-warning">
                      Automatic updates with webhook notifications and scheduled syncing.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <BrokerList onConnectionsChange={() => {}} />
            </TabsContent>

            {/* CSV Upload Tab */}
            <TabsContent value="csv" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-tertiary/10 to-tertiary/20 border-tertiary/30">
                  <CardContent className="p-6 text-center">
                    <Brain className="h-12 w-12 text-[var(--theme-tertiary)] mx-auto mb-4" />
                    <h3 className="font-semibold text-tertiary mb-2">AI-Powered Mapping</h3>
                    <p className="text-sm text-tertiary">
                      Smart column detection with confidence scoring and manual correction options.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-positive/10 to-positive/20 border-positive/30">
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 text-[var(--theme-green)] mx-auto mb-4" />
                    <h3 className="font-semibold text-positive mb-2">Secure Processing</h3>
                    <p className="text-sm text-positive">
                      Server-side validation, sanitization, and user-isolated data storage.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-warning/10 to-warning/20 border-warning/30">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-12 w-12 text-[var(--theme-tertiary)] mx-auto mb-4" />
                    <h3 className="font-semibold text-warning mb-2">Flexible Formats</h3>
                    <p className="text-sm text-warning">
                      Support for all major broker formats with intelligent format detection.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <EnhancedFileUpload
                onUploadComplete={handleUploadComplete}
                onMappingRequired={handleMappingRequired}
                accountTags={[]}
              />
            </TabsContent>
          </Tabs>

          {/* Documentation Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Standard Format Documentation */}
            <Card className="bg-surface border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Standard CSV Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted">
                  For fastest processing, use our standard format with these exact column headers:
                </p>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        <span className="font-medium">Date</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        <span className="font-medium">Symbol</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        <span className="font-medium">Buy/Sell</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        <span className="font-medium">Shares</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span>Time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span>Price</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span>Commission</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span>Fees</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span>Account</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('/api/csv/template', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* Custom Format Documentation */}
            <Card className="bg-surface border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Custom Format Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted">
                  Don&apos;t have the standard format? No problem! Our AI will:
                </p>
                
                <ul className="text-sm text-muted space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[var(--theme-green)] mt-0.5 flex-shrink-0" />
                    <span>Analyze your column headers and sample data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[var(--theme-green)] mt-0.5 flex-shrink-0" />
                    <span>Suggest mappings with confidence scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[var(--theme-green)] mt-0.5 flex-shrink-0" />
                    <span>Let you review and correct any mappings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[var(--theme-green)] mt-0.5 flex-shrink-0" />
                    <span>Provide clear guidance for problematic columns</span>
                  </li>
                </ul>

                <div className="p-3 bg-tertiary/10 border border-tertiary/30 rounded-lg">
                  <p className="text-xs text-tertiary">
                    <strong>Supported brokers:</strong> Interactive Brokers, TD Ameritrade, 
                    E*TRADE, Charles Schwab, and many others via custom mapping.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Import History Link */}
          <Card className="bg-gradient-to-r from-background to-surface border-default">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Need to review previous imports?</h3>
              <p className="text-sm text-gray-600 mb-4">
                View your import history, re-download failed batches, or check processing status.
              </p>
              <Link href="/import/history">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Import History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Column Mapping Modal */}
      {mappingModal.isOpen && mappingModal.aiMappingResult && (
        <ColumnMappingModal
          isOpen={mappingModal.isOpen}
          onClose={closeMappingModal}
          aiMappingResult={mappingModal.aiMappingResult}
          originalHeaders={mappingModal.originalHeaders}
          sampleData={mappingModal.sampleData}
          onApplyMappings={handleApplyMappings}
          isProcessing={isProcessingMapping}
        />
      )}
    </div>
  );
}