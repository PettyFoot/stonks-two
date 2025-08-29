import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = searchParams.get('demo') === 'true';
  
  let userId: string;
  
  if (demo) {
    userId = getDemoUserId();
  } else {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    userId = user.id;
  }

  // Get real metadata from database for both demo and authenticated users
  try {

    // Get metadata in parallel for performance
    const [
      distinctSymbols,
      distinctTags,
      priceRanges,
      volumeRange,
      executionRange,
      dateRange
    ] = await Promise.all([
      // Distinct symbols
      prisma.trade.findMany({
        where: { userId: userId },
        select: { symbol: true },
        distinct: ['symbol'],
        orderBy: { symbol: 'asc' }
      }),
      
      // All tags with counts
      prisma.trade.findMany({
        where: { 
          userId: userId,
          tags: { isEmpty: false }
        },
        select: { tags: true }
      }),
      
      // Price ranges - use a reasonable default since your trades might not have entry/exit prices
      Promise.resolve({
        _min: { entryPrice: 10, exitPrice: 10 },
        _max: { entryPrice: 500, exitPrice: 500 }
      }),
      
      // Volume range
      prisma.trade.aggregate({
        where: { 
          userId: userId,
          quantity: { not: null }
        },
        _min: { quantity: true },
        _max: { quantity: true }
      }),
      
      // Execution count range
      prisma.trade.aggregate({
        where: { userId: userId },
        _min: { executions: true },
        _max: { executions: true }
      }),
      
      // Date range
      prisma.trade.aggregate({
        where: { userId: userId },
        _min: { date: true, entryDate: true },
        _max: { date: true, entryDate: true }
      })
    ]);

    // Process tags to get counts
    const tagCounts: Record<string, number> = {};
    distinctTags.forEach(trade => {
      trade.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const tagsWithCounts = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Use default price range since your trades don't have entry/exit prices
    const finalPriceRange = {
      min: priceRanges._min.entryPrice || 10,
      max: priceRanges._max.entryPrice || 500
    };

    return NextResponse.json({
      symbols: distinctSymbols.map(t => t.symbol),
      tags: tagsWithCounts,
      priceRange: finalPriceRange,
      volumeRange: {
        min: volumeRange._min.quantity || 0,
        max: volumeRange._max.quantity || 0
      },
      executionCountRange: {
        min: executionRange._min.executions || 1,
        max: executionRange._max.executions || 1
      },
      dateRange: {
        earliest: dateRange._min.date ? dateRange._min.date.toISOString().split('T')[0] : null,
        latest: dateRange._max.date ? dateRange._max.date.toISOString().split('T')[0] : null
      }
    });
  } catch (error) {
    console.error('Trades metadata API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}