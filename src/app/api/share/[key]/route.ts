import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;

    if (!key) {
      return NextResponse.json(
        { error: 'Share key is required' },
        { status: 400 }
      );
    }

    // Find the shared trade by key
    const sharedTrade = await prisma.sharedTrade.findUnique({
      where: { shareKey: key }
    });

    if (!sharedTrade) {
      return NextResponse.json(
        { error: 'Shared trade not found' },
        { status: 404 }
      );
    }

    // Check if the share has expired
    if (new Date() > sharedTrade.expiresAt) {
      return NextResponse.json(
        { error: 'This shared trade link has expired' },
        { status: 410 } // Gone
      );
    }

    // Increment access count
    await prisma.sharedTrade.update({
      where: { id: sharedTrade.id },
      data: {
        accessCount: {
          increment: 1
        }
      }
    });

    // Return the trade and order data
    return NextResponse.json({
      trade: sharedTrade.tradeSnapshot,
      orders: sharedTrade.orderSnapshot,
      metadata: sharedTrade.metadata,
      expiresAt: sharedTrade.expiresAt,
      createdAt: sharedTrade.createdAt,
      success: true
    });

  } catch (error) {
    console.error('Share retrieval error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to retrieve shared trade',
        details: 'Please check the URL and try again'
      },
      { status: 500 }
    );
  }
}