'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import EnhancedFileUpload from '@/components/csv/EnhancedFileUpload';
import ColumnMappingModal from '@/components/csv/ColumnMappingModal';
import BrokerList from '@/components/broker/BrokerList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Shield,
  TrendingUp,
  Building2,
  Upload
} from 'lucide-react';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';
import Link from 'next/link';
import { useImportTracking } from '@/hooks/useImportTracking';

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

interface UploadLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  isUnlimited: boolean;
  used: number;
}

export default function EnhancedImportPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const { track } = useImportTracking();

  const [mappingModal, setMappingModal] = useState<MappingModalState>({
    isOpen: false,
    aiMappingResult: null,
    originalHeaders: [],
    sampleData: [],
    importBatchId: null,
  });

  const [isProcessingMapping, setIsProcessingMapping] = useState(false);
  const [uploadLimitStatus, setUploadLimitStatus] = useState<UploadLimitStatus | null>(null);
  const [activeTab, setActiveTab] = useState('broker');

  // Fetch upload limits when CSV tab becomes active
  const fetchUploadLimits = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/upload-limits');
      if (response.ok) {
        const limits = await response.json();
        setUploadLimitStatus(limits);
      } else {
        console.error('Failed to fetch upload limits');
      }
    } catch (error) {
      console.error('Error fetching upload limits:', error);
    }
  }, [user]);

  // Fetch limits when component mounts and when CSV tab is selected
  useEffect(() => {
    if (activeTab === 'csv') {
      fetchUploadLimits();
    }
  }, [activeTab, user, fetchUploadLimits]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader />
      </div>
    );
  }

  if (!user) return null;

  const handleUploadComplete = (result: Record<string, unknown>) => {

    
    // Prevent any form of page refresh or navigation
    // Stay on the import page - no redirect
    // The EnhancedFileUpload component will show success message
    if (typeof window !== 'undefined') {
      // Prevent any automatic redirects or refreshes
      window.history.replaceState(null, '', window.location.href);
    }
  };

  const handleMappingRequired = (result: Record<string, unknown>) => {

    
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

  const handleTabChange = (value: string) => {
    const previousTab = activeTab;
    setActiveTab(value);

    // Track tab change (non-blocking)
    track({
      action: 'tab_changed',
      component: 'ImportPage',
      metadata: {
        previousTab,
        newTab: value,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Import" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Import your trading data either by connecting your broker directly or uploading CSV files
              with AI-powered column mapping and real-time validation.
            </p>
          </div>

          {/* Import Methods Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="broker" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Broker Connect
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
            </TabsList>

            {/* Broker Connection Tab */}
            <TabsContent value="broker" className="space-y-6">
              <BrokerList onConnectionsChange={() => {}} />
              
              <div className="grid md:grid-cols-3 gap-6">
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
            </TabsContent>

            {/* CSV Upload Tab */}
            <TabsContent value="csv" className="space-y-6">
              <EnhancedFileUpload
                onUploadComplete={handleUploadComplete}
                onMappingRequired={handleMappingRequired}
                accountTags={[]}
                uploadLimitStatus={uploadLimitStatus}
                onRefreshLimits={fetchUploadLimits}
              />
            </TabsContent>
          </Tabs>


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