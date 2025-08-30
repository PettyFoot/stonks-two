'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UsageMetrics } from '@/components/subscription';
import {
  BarChart3,
  TrendingUp,
  Database,
  Download,
  FileText,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Mock usage data - replace with actual data from useUsageMetrics hook
const usageData = {
  currentPeriod: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    tradesImported: 23,
    reportsGenerated: 2,
    dataExports: 0,
    apiCalls: 145
  },
  limits: {
    tradesPerMonth: 50,
    reportsPerMonth: 5,
    dataExportsPerMonth: 0,
    apiCallsPerMonth: 1000
  },
  historical: [
    { month: 'Dec 2023', trades: 18, reports: 3, exports: 0 },
    { month: 'Nov 2023', trades: 31, reports: 4, exports: 0 },
    { month: 'Oct 2023', trades: 45, reports: 5, exports: 0 }
  ]
};

const calculateUsagePercentage = (used: number, limit: number) => {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
};

const getUsageStatus = (percentage: number) => {
  if (percentage >= 90) return { color: 'text-red-500', icon: AlertTriangle, label: 'Critical' };
  if (percentage >= 70) return { color: 'text-yellow-500', icon: Clock, label: 'Warning' };
  return { color: 'text-green-500', icon: CheckCircle, label: 'Good' };
};

export default function UsageTab() {
  const tradesPercentage = calculateUsagePercentage(
    usageData.currentPeriod.tradesImported, 
    usageData.limits.tradesPerMonth
  );
  const reportsPercentage = calculateUsagePercentage(
    usageData.currentPeriod.reportsGenerated, 
    usageData.limits.reportsPerMonth
  );

  const tradesStatus = getUsageStatus(tradesPercentage);
  const reportsStatus = getUsageStatus(reportsPercentage);

  return (
    <div className="space-y-6">
      {/* Current Usage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <Badge variant="secondary">
              January 2024
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trades Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium">Trades Imported</span>
                </div>
                <div className="flex items-center gap-2">
                  <tradesStatus.icon className={`h-4 w-4 ${tradesStatus.color}`} />
                  <span className="text-sm text-muted-foreground">
                    {usageData.currentPeriod.tradesImported} / {usageData.limits.tradesPerMonth}
                  </span>
                </div>
              </div>
              <Progress value={tradesPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usageData.limits.tradesPerMonth - usageData.currentPeriod.tradesImported} trades remaining this month
              </p>
            </div>

            {/* Reports Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Reports Generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <reportsStatus.icon className={`h-4 w-4 ${reportsStatus.color}`} />
                  <span className="text-sm text-muted-foreground">
                    {usageData.currentPeriod.reportsGenerated} / {usageData.limits.reportsPerMonth}
                  </span>
                </div>
              </div>
              <Progress value={reportsPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usageData.limits.reportsPerMonth - usageData.currentPeriod.reportsGenerated} reports remaining this month
              </p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">
                {usageData.currentPeriod.dataExports}
              </p>
              <p className="text-sm text-muted-foreground">Data Exports</p>
              <Badge variant="secondary" className="mt-1">
                Pro Feature
              </Badge>
            </div>
            
            <div className="text-center">
              <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">
                {usageData.currentPeriod.apiCalls}
              </p>
              <p className="text-sm text-muted-foreground">API Calls</p>
              <p className="text-xs text-muted-foreground">
                {usageData.limits.apiCallsPerMonth - usageData.currentPeriod.apiCalls} remaining
              </p>
            </div>
            
            <div className="text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">31</p>
              <p className="text-sm text-muted-foreground">Days in Period</p>
              <p className="text-xs text-muted-foreground">Resets Feb 1st</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Usage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageMetrics />
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.historical.map((period, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{period.month}</h4>
                  <p className="text-sm text-muted-foreground">
                    {period.trades} trades • {period.reports} reports • {period.exports} exports
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {Math.round((period.trades / usageData.limits.tradesPerMonth) * 100)}% usage
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Usage Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Approaching Trade Limit
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You&apos;ve used {tradesPercentage}% of your monthly trade limit. Consider upgrading to Pro for unlimited trades.
                </p>
                <Button size="sm" className="mt-2">
                  Upgrade Now
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Alert Preferences</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  Email me at 75% usage
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  Email me at 90% usage
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Daily usage summary emails
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Limits & Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Free Plan Limits</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Trades per month</span>
                  <span className="font-mono">50</span>
                </div>
                <div className="flex justify-between">
                  <span>Reports per month</span>
                  <span className="font-mono">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Data exports</span>
                  <span className="font-mono">0</span>
                </div>
                <div className="flex justify-between">
                  <span>API calls per month</span>
                  <span className="font-mono">1,000</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Pro Plan Benefits</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Trades per month</span>
                  <Badge variant="default" className="text-xs">Unlimited</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Reports per month</span>
                  <Badge variant="default" className="text-xs">Unlimited</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Data exports</span>
                  <Badge variant="default" className="text-xs">Unlimited</Badge>
                </div>
                <div className="flex justify-between">
                  <span>API calls per month</span>
                  <Badge variant="default" className="text-xs">10,000</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Button>Upgrade to Remove Limits</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}