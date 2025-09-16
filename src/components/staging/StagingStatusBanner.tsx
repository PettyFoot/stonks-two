'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, HelpCircle, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StagingStatus {
  pendingCount: number;
  totalStaged: number;
  formatsPendingApproval: number;
}

interface StagingStatusBannerProps {
  status: StagingStatus;
  onViewStagedOrders: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function StagingStatusBanner({
  status,
  onViewStagedOrders,
  onRefresh,
  isLoading = false
}: StagingStatusBannerProps) {
  if (status.pendingCount === 0) {
    return null; // Don't show banner if no pending orders
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Orders Pending Review
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {status.pendingCount} orders waiting for format approval
                  {status.formatsPendingApproval > 1 && (
                    <span className="ml-1">
                      across {status.formatsPendingApproval} different formats
                    </span>
                  )}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Typically reviewed within 2-4 hours</span>
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <HelpCircle className="h-3 w-3" />
                          <span>Why pending?</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Your CSV file uses a new format that our AI hasn't seen before.
                          Our team reviews these to ensure accurate data mapping before
                          your orders are added to your account.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewStagedOrders}
                  className="w-full sm:w-auto"
                >
                  View Staged Orders
                </Button>

                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Processing Status</span>
                <span>{status.formatsPendingApproval} format{status.formatsPendingApproval !== 1 ? 's' : ''} pending</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: '25%' }} // Assuming early in approval process
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Uploaded</span>
                <span>Under Review</span>
                <span>Approved</span>
              </div>
            </div>

            {/* Additional info for multiple formats */}
            {status.formatsPendingApproval > 1 && (
              <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Multiple formats detected:</strong> You have uploads from {status.formatsPendingApproval} different
                  brokers or file formats. Each format needs individual approval before processing.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}