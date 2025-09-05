'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface StatsGridProps {
  totalExecutions: number;
  symbol?: string;
  totalVolume: number;
  mfeRatio?: number;
  commissions?: number;
  netPnl: number;
  className?: string;
}

export default function StatsGrid({
  totalExecutions,
  symbol,
  totalVolume,
  mfeRatio,
  commissions = 0,
  netPnl,
  className = ""
}: StatsGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ${className}`}>
      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">Total Executions</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-base sm:text-lg font-bold text-primary">{totalExecutions}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">Symbol</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-base sm:text-lg font-bold text-primary">
                {symbol || '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">Total Volume</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-base sm:text-lg font-bold text-primary">{totalVolume.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">MFE/MAE Ratio</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-base sm:text-lg font-bold text-primary">
                {mfeRatio ? mfeRatio.toFixed(2) : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">Commissions/Fees</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-base sm:text-lg font-bold text-primary">
                ${commissions}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col h-full">
            <div className="text-xs sm:text-sm text-muted mb-2 text-center">Net P&L</div>
            <div className="flex-1 flex items-center justify-center">
              <div className={`text-lg font-bold ${
                netPnl >= 0 ? 'text-positive' : 'text-negative'
              }`}>
                ${netPnl.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}