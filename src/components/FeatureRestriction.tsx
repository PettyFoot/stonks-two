'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, Upload, Edit, Download, Zap } from 'lucide-react';

interface FeatureRestrictionProps {
  feature: 'upload' | 'edit' | 'export' | 'api' | 'delete';
  children: React.ReactNode;
  showUpgrade?: boolean;
  className?: string;
}

export function FeatureRestriction({ 
  feature, 
  children, 
  showUpgrade = true,
  className = ''
}: FeatureRestrictionProps) {
  const { isDemo, upgradeUrl } = useAuth();

  if (!isDemo) return <>{children}</>;

  const featureConfig = {
    upload: {
      title: 'Import Your Own Trades',
      description: 'Upload CSV files from any broker',
      icon: Upload
    },
    edit: {
      title: 'Edit and Manage Trades',
      description: 'Modify trades and add notes',
      icon: Edit
    },
    export: {
      title: 'Export Your Data',
      description: 'Download trades and reports',
      icon: Download
    },
    api: {
      title: 'API Access',
      description: 'Connect with external tools',
      icon: Zap
    },
    delete: {
      title: 'Delete Data',
      description: 'Remove trades and records',
      icon: Lock
    }
  };

  const config = featureConfig[feature];
  const Icon = config.icon;

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-40 pointer-events-none blur-[1px]">
        {children}
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-6 w-6 text-purple-600" />
          </div>
          
          <h3 className="font-semibold text-gray-900 mb-2">
            {config.title}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            {config.description} with a real account
          </p>
          
          {showUpgrade && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              onClick={() => window.location.href = upgradeUrl}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified wrapper for common use cases
export function RestrictUpload({ children }: { children: React.ReactNode }) {
  return <FeatureRestriction feature="upload">{children}</FeatureRestriction>;
}

export function RestrictEdit({ children }: { children: React.ReactNode }) {
  return <FeatureRestriction feature="edit">{children}</FeatureRestriction>;
}

export function RestrictExport({ children }: { children: React.ReactNode }) {
  return <FeatureRestriction feature="export">{children}</FeatureRestriction>;
}