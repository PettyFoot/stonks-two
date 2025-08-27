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
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Total Executions</div>
            <div className="text-lg font-bold text-primary">{totalExecutions}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Win %</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-[#16A34A]">
                {winRate ? winRate.toFixed(0) : '0'}%
              </div>
              <Lock className="h-3 w-3 text-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Total Volume</div>
            <div className="text-lg font-bold text-primary">{totalVolume.toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">MFE/MAE Ratio</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-primary">
                {mfeRatio ? mfeRatio.toFixed(2) : '-'}
              </div>
              <Lock className="h-3 w-3 text-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Commissions/Fees</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-primary">
                ${commissions}
              </div>
              <Lock className="h-3 w-3 text-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Net P&L</div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${
                netPnl >= 0 ? 'text-positive' : 'text-negative'
              }`}>
                ${netPnl.toFixed(2)}
              </div>
              <Lock className="h-3 w-3 text-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}