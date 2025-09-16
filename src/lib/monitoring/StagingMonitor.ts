import { prisma } from '@/lib/prisma';

export interface StagingMetrics {
  operation: string;
  formatId?: string;
  success: boolean;
  duration: number;
  recordCount: number;
  errorRate: number;
  timestamp: Date;
}

export interface AlertConfig {
  type: 'HIGH_ERROR_RATE' | 'MIGRATION_FAILED' | 'STAGING_BACKLOG' | 'FORMAT_APPROVAL_DELAY';
  threshold: number;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Monitoring service for the staging system
 * Tracks performance, errors, and system health
 */
export class StagingMonitor {
  private static readonly ALERT_CONFIGS: AlertConfig[] = [
    {
      type: 'HIGH_ERROR_RATE',
      threshold: 0.05, // 5% error rate
      message: 'High error rate detected in staging operations',
      severity: 'HIGH'
    },
    {
      type: 'MIGRATION_FAILED',
      threshold: 1, // Any failed migration
      message: 'Format migration failed',
      severity: 'CRITICAL'
    },
    {
      type: 'STAGING_BACKLOG',
      threshold: 10000, // 10k pending orders
      message: 'Large staging backlog detected',
      severity: 'MEDIUM'
    },
    {
      type: 'FORMAT_APPROVAL_DELAY',
      threshold: 24, // 24 hours
      message: 'Formats pending approval for too long',
      severity: 'MEDIUM'
    }
  ];

  /**
   * Record performance metrics for staging operations
   */
  static async recordMetrics(metrics: StagingMetrics): Promise<void> {
    try {
      // Store metrics in database (you might want to use a separate metrics table)
      await prisma.stagingAuditLog.create({
        data: {
          stagingId: metrics.formatId || 'system',
          action: metrics.operation,
          performedBy: 'system',
          previousState: {},
          newState: {
            success: metrics.success,
            duration: metrics.duration,
            recordCount: metrics.recordCount,
            errorRate: metrics.errorRate
          },
          timestamp: metrics.timestamp
        }
      });

      // Check for alert conditions
      await this.checkAlerts(metrics);

      console.log(`[StagingMonitor] Metrics recorded: ${metrics.operation} - ${metrics.success ? 'SUCCESS' : 'FAILED'} (${metrics.duration}ms)`);

    } catch (error) {
      console.error('[StagingMonitor] Failed to record metrics:', error);
      // Don't fail the operation for monitoring issues
    }
  }

  /**
   * Check alert conditions and send alerts if thresholds are exceeded
   */
  private static async checkAlerts(metrics: StagingMetrics): Promise<void> {
    const alerts: AlertConfig[] = [];

    // Check error rate
    if (metrics.errorRate > this.ALERT_CONFIGS[0].threshold) {
      alerts.push(this.ALERT_CONFIGS[0]);
    }

    // Check for failed operations
    if (!metrics.success && metrics.operation.includes('migration')) {
      alerts.push(this.ALERT_CONFIGS[1]);
    }

    // Check staging backlog
    const pendingCount = await prisma.orderStaging.count({
      where: { migrationStatus: 'PENDING' }
    });

    if (pendingCount > this.ALERT_CONFIGS[2].threshold) {
      alerts.push(this.ALERT_CONFIGS[2]);
    }

    // Check format approval delays
    const oldestPending = await prisma.brokerCsvFormat.findFirst({
      where: { isApproved: false },
      orderBy: { createdAt: 'asc' }
    });

    if (oldestPending) {
      const hoursOld = (Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursOld > this.ALERT_CONFIGS[3].threshold) {
        alerts.push(this.ALERT_CONFIGS[3]);
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert.type, {
        ...metrics,
        message: alert.message,
        severity: alert.severity
      });
    }
  }

  /**
   * Send alert notification
   */
  static async sendAlert(alertType: string, data: any): Promise<void> {
    try {
      // In a real implementation, you would send to Slack, email, or monitoring service
      console.error(`[ALERT] ${alertType}: ${data.message}`, data);

      // You could also store alerts in database for admin dashboard
      // await prisma.systemAlert.create({ ... });

      // For now, just log to console
      // TODO: Implement actual alerting (email, Slack, PagerDuty, etc.)

    } catch (error) {
      console.error('[StagingMonitor] Failed to send alert:', error);
    }
  }

  /**
   * Get system health metrics
   */
  static async getHealthMetrics(): Promise<{
    stagingHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    pendingOrdersCount: number;
    pendingFormatsCount: number;
    avgProcessingTime: number;
    errorRate: number;
    oldestPendingHours: number;
  }> {
    try {
      const [pendingOrders, pendingFormats, oldestPending, recentMetrics] = await Promise.all([
        prisma.orderStaging.count({
          where: { migrationStatus: 'PENDING' }
        }),
        prisma.brokerCsvFormat.count({
          where: { isApproved: false }
        }),
        prisma.brokerCsvFormat.findFirst({
          where: { isApproved: false },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.stagingAuditLog.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        })
      ]);

      // Calculate metrics from recent operations
      const avgProcessingTime = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + (m.newState as any)?.duration || 0, 0) / recentMetrics.length
        : 0;

      const errorRate = recentMetrics.length > 0
        ? recentMetrics.filter(m => !(m.newState as any)?.success).length / recentMetrics.length
        : 0;

      const oldestPendingHours = oldestPending
        ? (Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60)
        : 0;

      // Determine health status
      let health: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

      if (errorRate > 0.1 || oldestPendingHours > 48 || pendingOrders > 50000) {
        health = 'CRITICAL';
      } else if (errorRate > 0.05 || oldestPendingHours > 24 || pendingOrders > 10000) {
        health = 'WARNING';
      }

      return {
        stagingHealth: health,
        pendingOrdersCount: pendingOrders,
        pendingFormatsCount: pendingFormats,
        avgProcessingTime,
        errorRate,
        oldestPendingHours
      };

    } catch (error) {
      console.error('[StagingMonitor] Failed to get health metrics:', error);
      return {
        stagingHealth: 'CRITICAL',
        pendingOrdersCount: 0,
        pendingFormatsCount: 0,
        avgProcessingTime: 0,
        errorRate: 1,
        oldestPendingHours: 0
      };
    }
  }

  /**
   * Clean up old staging records and audit logs
   */
  static async cleanupOldRecords(): Promise<{ deletedStaging: number; deletedLogs: number }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [deletedStaging, deletedLogs] = await Promise.all([
        prisma.orderStaging.deleteMany({
          where: {
            createdAt: { lt: thirtyDaysAgo },
            migrationStatus: { in: ['MIGRATED', 'REJECTED', 'FAILED'] }
          }
        }),
        prisma.stagingAuditLog.deleteMany({
          where: {
            timestamp: { lt: thirtyDaysAgo }
          }
        })
      ]);

      console.log(`[StagingMonitor] Cleanup completed: ${deletedStaging.count} staging records, ${deletedLogs.count} audit logs`);

      return {
        deletedStaging: deletedStaging.count,
        deletedLogs: deletedLogs.count
      };

    } catch (error) {
      console.error('[StagingMonitor] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Track format approval performance
   */
  static async trackApproval(formatId: string, success: boolean, duration: number): Promise<void> {
    await this.recordMetrics({
      operation: 'format_approval',
      formatId,
      success,
      duration,
      recordCount: 1,
      errorRate: success ? 0 : 1,
      timestamp: new Date()
    });
  }

  /**
   * Track migration performance
   */
  static async trackMigration(
    formatId: string,
    success: boolean,
    duration: number,
    recordCount: number,
    errorCount: number
  ): Promise<void> {
    await this.recordMetrics({
      operation: 'order_migration',
      formatId,
      success,
      duration,
      recordCount,
      errorRate: recordCount > 0 ? errorCount / recordCount : 0,
      timestamp: new Date()
    });
  }

  /**
   * Track staging operations
   */
  static async trackStaging(
    formatId: string,
    success: boolean,
    duration: number,
    recordCount: number,
    errorCount: number
  ): Promise<void> {
    await this.recordMetrics({
      operation: 'order_staging',
      formatId,
      success,
      duration,
      recordCount,
      errorRate: recordCount > 0 ? errorCount / recordCount : 0,
      timestamp: new Date()
    });
  }
}