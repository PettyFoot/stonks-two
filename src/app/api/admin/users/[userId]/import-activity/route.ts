import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/auth0';

interface ImportInteractionStat {
  id: string;
  action: string;
  component: string;
  outcome: string | null;
  errorMessage: string | null;
  metadata: any;
  importBatchId: string | null;
  timestamp: Date;
}

interface ActivitySummary {
  totalInteractions: number;
  successfulActions: number;
  failedActions: number;
  cancelledActions: number;
  uniqueComponents: number;
  lastActivity: Date | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin authentication
    await requireAdminAuth();

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');
    const outcomeFilter = searchParams.get('outcome') || 'all'; // all, success, failure, cancelled
    const componentFilter = searchParams.get('component') || 'all';

    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Build where clause
    const whereClause: any = {
      userId,
      timestamp: {
        gte: dateThreshold,
      },
    };

    // Apply outcome filter
    if (outcomeFilter !== 'all') {
      whereClause.outcome = outcomeFilter;
    }

    // Apply component filter
    if (componentFilter !== 'all') {
      whereClause.component = componentFilter;
    }

    // Fetch all import interactions for the user within the date range
    const interactions = await prisma.importPageInteraction.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc',
      },
      take: 500, // Limit to 500 most recent interactions
    });

    // Calculate summary stats
    const totalInteractions = interactions.length;
    const successfulActions = interactions.filter(i => i.outcome === 'success').length;
    const failedActions = interactions.filter(i => i.outcome === 'failure').length;
    const cancelledActions = interactions.filter(i => i.outcome === 'cancelled').length;
    const uniqueComponents = new Set(interactions.map(i => i.component)).size;
    const lastActivity = interactions.length > 0 ? interactions[0].timestamp : null;

    // Group interactions by action for quick insights
    const actionStats = new Map<string, {
      count: number;
      successCount: number;
      failureCount: number;
    }>();

    interactions.forEach(interaction => {
      const existing = actionStats.get(interaction.action);
      if (existing) {
        existing.count++;
        if (interaction.outcome === 'success') existing.successCount++;
        if (interaction.outcome === 'failure') existing.failureCount++;
      } else {
        actionStats.set(interaction.action, {
          count: 1,
          successCount: interaction.outcome === 'success' ? 1 : 0,
          failureCount: interaction.outcome === 'failure' ? 1 : 0,
        });
      }
    });

    // Convert action stats to array
    const actionSummary = Array.from(actionStats.entries()).map(([action, stats]) => ({
      action,
      ...stats,
    }));

    return NextResponse.json({
      summary: {
        totalInteractions,
        successfulActions,
        failedActions,
        cancelledActions,
        uniqueComponents,
        lastActivity,
      },
      interactions: interactions.map(i => ({
        id: i.id,
        action: i.action,
        component: i.component,
        outcome: i.outcome,
        errorMessage: i.errorMessage,
        metadata: i.metadata,
        importBatchId: i.importBatchId,
        timestamp: i.timestamp,
      })),
      actionSummary,
    });
  } catch (error) {
    console.error('Error fetching import activity:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch import activity' },
      { status: 500 }
    );
  }
}
