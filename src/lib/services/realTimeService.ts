import { prisma } from '@/lib/prisma';
import { CacheService } from './cacheService';

export class RealTimeService {
  private cacheService: CacheService;
  private subscribers: Map<string, Set<(data: any) => void>>;

  constructor() {
    this.cacheService = new CacheService();
    this.subscribers = new Map();
    this.initializePostgresListener();
  }

  /**
   * Initialize PostgreSQL LISTEN/NOTIFY for real-time updates
   */
  private async initializePostgresListener() {
    try {
      // Create a dedicated connection for listening to notifications
      const { Client } = await import('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await client.connect();
      
      // Listen for analytics refresh notifications
      await client.query('LISTEN analytics_views_refresh');
      
      client.on('notification', async (msg) => {
        if (msg.channel === 'analytics_views_refresh' && msg.payload) {
          const userId = msg.payload;
          await this.handleAnalyticsRefresh(userId);
        }
      });

      console.log('Real-time analytics listener initialized');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL listener:', error);
    }
  }

  /**
   * Handle analytics refresh when trades are updated
   */
  private async handleAnalyticsRefresh(userId: string) {
    try {
      // Invalidate user's analytics cache
      await this.cacheService.invalidateUserAnalytics(userId);
      
      // Refresh materialized views in background
      await this.refreshMaterializedViews();
      
      // Notify subscribers
      this.notifySubscribers(userId, { type: 'analytics_refresh', userId });
      
      // Pre-warm cache with common queries
      await this.preWarmAnalyticsCache(userId);
      
    } catch (error) {
      console.error('Error handling analytics refresh:', error);
    }
  }

  /**
   * Subscribe to real-time updates for a user
   */
  subscribe(userId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    
    this.subscribers.get(userId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.delete(callback);
        if (userSubscribers.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  /**
   * Notify subscribers of updates
   */
  private notifySubscribers(userId: string, data: any) {
    const userSubscribers = this.subscribers.get(userId);
    if (userSubscribers) {
      userSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }

  /**
   * Refresh materialized views for analytics
   */
  async refreshMaterializedViews(): Promise<void> {
    try {
      await prisma.$executeRaw`SELECT refresh_analytics_views()`;
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
    }
  }

  /**
   * Pre-warm cache with common analytics queries
   */
  private async preWarmAnalyticsCache(userId: string) {
    const { AnalyticsService } = await import('./analyticsService');
    const analyticsService = new AnalyticsService(userId);

    const commonQueries = [
      { preset: '30d' as const, aggregations: ['statistics'] as const },
      { preset: '90d' as const, aggregations: ['performance'] as const },
      { preset: 'ytd' as const, aggregations: ['distribution'] as const }
    ];

    // Execute in background without blocking
    Promise.all(
      commonQueries.map(async query => {
        try {
          const dateRange = analyticsService.parseDateRange({ preset: query.preset });
          const where = analyticsService.buildWhereClause(dateRange);
          
          if (query.aggregations.includes('statistics')) {
            await analyticsService.calculateStatistics(where);
          }
          if (query.aggregations.includes('performance')) {
            await analyticsService.calculatePerformanceMetrics(where);
          }
          if (query.aggregations.includes('distribution')) {
            await analyticsService.calculateDistributionMetrics(where);
          }
        } catch (error) {
          console.error('Cache warming error:', error);
        }
      })
    ).catch(error => {
      console.error('Cache warming batch error:', error);
    });
  }

  /**
   * Server-Sent Events endpoint for real-time updates
   */
  createSSEHandler(userId: string) {
    return (req: Request) => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start: (controller) => {
          // Send initial connection message
          const data = `data: ${JSON.stringify({ type: 'connected', userId })}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Subscribe to updates
          const unsubscribe = this.subscribe(userId, (update) => {
            const data = `data: ${JSON.stringify(update)}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          // Handle client disconnect
          req.signal?.addEventListener('abort', () => {
            unsubscribe();
            controller.close();
          });

          // Send periodic heartbeat
          const heartbeat = setInterval(() => {
            const data = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }, 30000); // 30 seconds

          // Clean up on close
          const cleanup = () => {
            clearInterval(heartbeat);
            unsubscribe();
          };

          controller.closed.then(cleanup).catch(cleanup);
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        }
      });
    };
  }

  /**
   * Background job for periodic analytics updates
   */
  async runPeriodicUpdates() {
    try {
      // Refresh materialized views every 5 minutes
      setInterval(async () => {
        try {
          await this.refreshMaterializedViews();
          console.log('Materialized views refreshed');
        } catch (error) {
          console.error('Periodic view refresh error:', error);
        }
      }, 5 * 60 * 1000);

      // Update quick stats every minute
      setInterval(async () => {
        try {
          await this.updateQuickStatsForAllUsers();
        } catch (error) {
          console.error('Quick stats update error:', error);
        }
      }, 60 * 1000);

      console.log('Periodic analytics updates initialized');
    } catch (error) {
      console.error('Failed to initialize periodic updates:', error);
    }
  }

  /**
   * Update quick stats for all active users
   */
  private async updateQuickStatsForAllUsers() {
    try {
      // Get users with recent activity (traded in last 30 days)
      const activeUsers = await prisma.user.findMany({
        where: {
          trades: {
            some: {
              date: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        },
        select: { id: true }
      });

      // Update quick stats for each user
      await Promise.allSettled(
        activeUsers.map(async user => {
          const quickStats = await this.calculateQuickStats(user.id);
          await this.cacheService.setQuickStats(user.id, quickStats);
        })
      );

    } catch (error) {
      console.error('Error updating quick stats for all users:', error);
    }
  }

  /**
   * Calculate quick stats for a user
   */
  private async calculateQuickStats(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [overall, todayStats, weekStats, monthStats] = await Promise.all([
      // Overall stats
      prisma.trade.aggregate({
        where: { userId, isCalculated: true, status: 'CLOSED' },
        _sum: { pnl: true },
        _count: true
      }),
      
      // Today's stats
      prisma.trade.aggregate({
        where: { 
          userId, 
          isCalculated: true, 
          status: 'CLOSED',
          date: { gte: today }
        },
        _sum: { pnl: true }
      }),
      
      // This week's stats
      prisma.trade.aggregate({
        where: { 
          userId, 
          isCalculated: true, 
          status: 'CLOSED',
          date: { gte: thisWeekStart }
        },
        _sum: { pnl: true }
      }),
      
      // This month's stats
      prisma.trade.aggregate({
        where: { 
          userId, 
          isCalculated: true, 
          status: 'CLOSED',
          date: { gte: thisMonthStart }
        },
        _sum: { pnl: true }
      })
    ]);

    // Calculate win rate
    const winningTrades = await prisma.trade.count({
      where: { 
        userId, 
        isCalculated: true, 
        status: 'CLOSED',
        pnl: { gt: 0 }
      }
    });

    const winRate = overall._count > 0 ? (winningTrades / overall._count) * 100 : 0;

    return {
      totalPnl: Number(overall._sum.pnl || 0),
      totalTrades: overall._count,
      winRate,
      todayPnl: Number(todayStats._sum.pnl || 0),
      thisWeekPnl: Number(weekStats._sum.pnl || 0),
      thisMonthPnl: Number(monthStats._sum.pnl || 0),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Trigger immediate analytics update for a user
   */
  async triggerAnalyticsUpdate(userId: string) {
    try {
      await this.handleAnalyticsRefresh(userId);
      console.log(`Analytics update triggered for user: ${userId}`);
    } catch (error) {
      console.error('Error triggering analytics update:', error);
    }
  }
}

// Singleton instance
export const realTimeService = new RealTimeService();

// Initialize periodic updates on server start
if (typeof window === 'undefined') {
  realTimeService.runPeriodicUpdates();
}