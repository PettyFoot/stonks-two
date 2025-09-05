import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Basic authentication - you might want to add a secret key or admin check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_SECRET || 'cleanup-secret';
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    
    // Find expired shares first for logging
    const expiredShares = await prisma.sharedTrade.findMany({
      where: {
        expiresAt: {
          lt: now
        }
      },
      select: {
        id: true,
        shareKey: true,
        expiresAt: true,
        accessCount: true,
        createdAt: true
      }
    });

    if (expiredShares.length === 0) {
      return NextResponse.json({
        message: 'No expired shares found',
        deleted: 0,
        success: true
      });
    }

    // Delete expired shares
    const deleteResult = await prisma.sharedTrade.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    // Get remaining stats
    const remainingCount = await prisma.sharedTrade.count();
    const nearExpiryCount = await prisma.sharedTrade.count({
      where: {
        expiresAt: {
          lt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      }
    });

    console.log(`[CLEANUP] Deleted ${deleteResult.count} expired shared trades`);
    console.log(`[CLEANUP] Remaining active shares: ${remainingCount}`);
    console.log(`[CLEANUP] Shares expiring in next 24h: ${nearExpiryCount}`);

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} expired shared trades`,
      deleted: deleteResult.count,
      remaining: remainingCount,
      nearExpiry: nearExpiryCount,
      success: true
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Cleanup failed',
        success: false
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  try {
    const now = new Date();
    
    const totalShares = await prisma.sharedTrade.count();
    const expiredShares = await prisma.sharedTrade.count({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
    const nearExpiryShares = await prisma.sharedTrade.count({
      where: {
        expiresAt: {
          lt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    return NextResponse.json({
      totalShares,
      expiredShares,
      nearExpiryShares,
      activeShares: totalShares - expiredShares,
      status: 'healthy'
    });

  } catch (error) {
    console.error('Cleanup status check error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Status check failed',
        status: 'error'
      },
      { status: 500 }
    );
  }
}