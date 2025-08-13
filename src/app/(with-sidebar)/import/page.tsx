'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import EnhancedFileUpload from '@/components/csv/EnhancedFileUpload';
import ColumnMappingModal from '@/components/csv/ColumnMappingModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  BookOpen,
  Zap,
  Brain,
  Shield,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface MappingModalState {
  isOpen: boolean;
  aiMappingResult: Record<string, unknown> | null;
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2563EB] mx-auto mb-4"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleUploadComplete = (result: Record<string, unknown>) => {
    console.log('Upload completed:', result);
    
    // Show success message and redirect
    setTimeout(() => {
      router.push('/trades?imported=true');
    }, 2000);
  };

  const handleMappingRequired = (result: Record<string, unknown>) => {
    console.log('Mapping required:', result);
    
    setMappingModal({
      isOpen: true,
      aiMappingResult: result.aiMappingResult as Record<string, unknown> | null,
      originalHeaders: result.aiMappingResult?.mappings.map((m: Record<string, unknown>) => m.sourceColumn) || [],
      sampleData: [], // Would need to be passed from the upload component
      importBatchId: result.importBatchId as string | null,
    });
  };

  const handleApplyMappings = async (mappings: Record<string, unknown>[]) => {
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
              <div className="p-3 bg-[#F0F9FF] rounded-full">
                <Zap className="h-8 w-8 text-[#2563EB]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Smart CSV Import</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Import your trading data with AI-powered column mapping, real-time validation, 
              and comprehensive error handling.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border-[#93C5FD]">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-[#2563EB] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E40AF] mb-2">AI-Powered Mapping</h3>
                <p className="text-sm text-[#1E40AF]">
                  Smart column detection with confidence scoring and manual correction options.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border-[#86EFAC]">
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-[#16A34A] mx-auto mb-4" />
                <h3 className="font-semibold text-[#15803D] mb-2">Secure Processing</h3>
                <p className="text-sm text-[#15803D]">
                  Server-side validation, sanitization, and user-isolated data storage.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border-[#FDE68A]">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-[#F59E0B] mx-auto mb-4" />
                <h3 className="font-semibold text-[#D97706] mb-2">Real-time Analytics</h3>
                <p className="text-sm text-[#D97706]">
                  Instant validation feedback and processing status with detailed error reporting.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Upload Component */}
          <EnhancedFileUpload
            onUploadComplete={handleUploadComplete}
            onMappingRequired={handleMappingRequired}
            accountTags={[]}
          />

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
                    <CheckCircle className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                    <span>Analyze your column headers and sample data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                    <span>Suggest mappings with confidence scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                    <span>Let you review and correct any mappings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                    <span>Provide clear guidance for problematic columns</span>
                  </li>
                </ul>

                <div className="p-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
                  <p className="text-xs text-[#0369A1]">
                    <strong>Supported brokers:</strong> Interactive Brokers, TD Ameritrade, 
                    E*TRADE, Charles Schwab, and many others via custom mapping.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Import History Link */}
          <Card className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-[#CBD5E1]">
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