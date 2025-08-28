'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export interface StatsGridProps {
  totalExecutions: number;
  winRate?: number;
  totalVolume: number;
  mfeRatio?: number;
  commissions?: number;
  netPnl: number;
  className?: string;
}

export default function StatsGrid({
  totalExecutions,
  winRate,
  totalVolume,
  mfeRatio,
  commissions = 0,
  netPnl,
  className = ""
}: StatsGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">Total Executions</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg font-bold text-primary">{totalExecutions}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">Win %</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-positive">
                  {winRate ? winRate.toFixed(0) : '0'}%
                </div>
                <Lock className="h-3 w-3 text-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">Total Volume</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg font-bold text-primary">{totalVolume.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">MFE/MAE Ratio</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-primary">
                  {mfeRatio ? mfeRatio.toFixed(2) : '-'}
                </div>
                <Lock className="h-3 w-3 text-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">Commissions/Fees</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-primary">
                  ${commissions}
                </div>
                <Lock className="h-3 w-3 text-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted mb-2 text-center">Net P&L</div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold ${
                  netPnl >= 0 ? 'text-positive' : 'text-negative'
                }`}>
                  ${netPnl.toFixed(2)}
                </div>
                <Lock className="h-3 w-3 text-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}