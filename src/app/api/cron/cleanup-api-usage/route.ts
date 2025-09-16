import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Daily cleanup job that removes API usage records older than 1 hour
 * This runs at 1 AM daily via Vercel cron
 */
export async function GET(request: Request) {
  try {
    // Verify this is being called by Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Delete API usage records older than 1 hour
    const result = await prisma.$executeRaw`
      DELETE FROM api_usage 
      WHERE timestamp < (NOW() - INTERVAL '1 hour')
    `;

    const endTime = Date.now();
    const duration = endTime - startTime;



    // Update table statistics for better query performance
    await prisma.$executeRaw`ANALYZE api_usage`;

    return NextResponse.json({
      success: true,
      recordsDeleted: result,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      message: `Deleted ${result} API usage records older than 1 hour`
    });

  } catch (error) {
    console.error('❌ API usage cleanup job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}

// Only allow GET method
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}