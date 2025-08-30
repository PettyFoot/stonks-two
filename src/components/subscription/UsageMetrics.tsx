'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsageMetrics, useUsageFormatters, type UsageMetric } from '@/hooks/useUsageMetrics';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  TrendingUp, 
  Database, 
  Download,
  Activity,
  RefreshCw,
  AlertTriangle,
  Crown,
  Calendar,
  Zap,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageMetricsProps {
  className?: string;
  showUpgradePrompt?: boolean;
  compact?: boolean;
}

export function UsageMetrics({ 
  className, 
  showUpgradePrompt = true,
  compact = false 
}: UsageMetricsProps) {
  const {
    metrics,
    summary,
    isLoading,
    error,
    refresh,
    isNearLimit,
    getHighestUsageMetric
  } = useUsageMetrics();

  const { hasPremiumAccess, createCheckoutSession } = useSubscription();
  
  const {
    formatUsage,
    formatPercentage,
    getUsageColor,
    formatResetDate,
    getUsageStatusText
  } = useUsageFormatters();

  const [upgradeLoading, setUpgradeLoading] = React.useState(false);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        console.error('Upgrade error:', result.error);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'trades':
        return TrendingUp;
      case 'storage':
        return Database;
      case 'exports':
        return Download;
      case 'api':
        return Activity;
      default:
        return Activity;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Usage Metrics
          </CardTitle>
          <CardDescription>Track your feature usage and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load usage metrics</p>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nearLimit = isNearLimit(80);
  const highestUsage = getHighestUsageMetric();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Usage Alert */}
      {nearLimit && !hasPremiumAccess && showUpgradePrompt && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Approaching Usage Limit</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You're near your {highestUsage?.name.toLowerCase()} limit. 
                  Upgrade to Premium for unlimited access.
                </p>
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  size="sm"
                >
                  {upgradeLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to Premium
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Usage Metrics
              </CardTitle>
              <CardDescription>
                {summary?.period === 'billing_cycle' 
                  ? 'Current billing cycle usage' 
                  : 'Current month usage'
                }
              </CardDescription>
            </div>
            <Button onClick={refresh} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {summary && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Requests</span>
                </div>
                <p className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Period</span>
                </div>
                <p className="text-sm font-medium">
                  {new Date(summary.periodStart).toLocaleDateString()} - 
                  {new Date(summary.periodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {metrics.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No usage data</h3>
              <p className="text-sm text-muted-foreground">
                Start using the platform to see your usage metrics
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <UsageMetricCard
                  key={metric.category}
                  metric={metric}
                  compact={compact}
                  formatUsage={formatUsage}
                  formatPercentage={formatPercentage}
                  getUsageColor={getUsageColor}
                  formatResetDate={formatResetDate}
                  getUsageStatusText={getUsageStatusText}
                  getMetricIcon={getMetricIcon}
                />
              ))}
            </div>
          )}

          {/* Premium Features Teaser */}
          {!hasPremiumAccess && showUpgradePrompt && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <h4 className="font-medium">Premium Benefits</h4>
                    <p className="text-sm text-muted-foreground">
                      Remove all limits and get unlimited access
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  size="sm"
                >
                  {upgradeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Upgrade'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface UsageMetricCardProps {
  metric: UsageMetric;
  compact: boolean;
  formatUsage: (current: number, limit: number | null, unit: string) => string;
  formatPercentage: (percentage: number) => string;
  getUsageColor: (percentage: number) => string;
  formatResetDate: (resetDate?: string) => string;
  getUsageStatusText: (metric: UsageMetric) => string;
  getMetricIcon: (category: string) => React.ComponentType<{ className?: string }>;
}

function UsageMetricCard({
  metric,
  compact,
  formatUsage,
  formatPercentage,
  getUsageColor,
  formatResetDate,
  getUsageStatusText,
  getMetricIcon
}: UsageMetricCardProps) {
  const IconComponent = getMetricIcon(metric.category);
  const isUnlimited = metric.limit === null;
  const statusText = getUsageStatusText(metric);

  return (
    <Card className={cn(
      "transition-all duration-200",
      metric.percentage >= 90 && "ring-2 ring-destructive/20",
      compact && "p-4"
    )}>
      <CardContent className={cn("space-y-3", compact ? "p-0" : "pt-6")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={cn(
              "h-4 w-4",
              isUnlimited ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )} />
            <span className="font-medium">{metric.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isUnlimited && (
              <Badge 
                variant={getUsageColor(metric.percentage)}
                className="text-xs"
              >
                {formatPercentage(metric.percentage)}
              </Badge>
            )}
            <Badge variant={isUnlimited ? 'default' : 'secondary'} className="text-xs">
              {statusText}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">
              {formatUsage(metric.current, metric.limit, metric.unit)}
            </span>
          </div>

          {!isUnlimited && (
            <Progress 
              value={Math.min(metric.percentage, 100)} 
              className={cn(
                "h-2",
                metric.percentage >= 90 && "bg-destructive/10"
              )}
            />
          )}
        </div>

        {!compact && metric.resetDate && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Resets in</span>
            <span>{formatResetDate(metric.resetDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}