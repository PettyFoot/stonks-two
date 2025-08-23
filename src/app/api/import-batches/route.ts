import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

// GET - List all import batches for a user
export async function GET() {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const importBatches = await prisma.importBatch.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            trades: true,
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(importBatches);
  } catch (error) {
    console.error('Error fetching import batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import batches' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an import batch and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
    }

    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the batch belongs to the user
    const batch = await prisma.importBatch.findFirst({
      where: {
        id: batchId,
        userId: user.id
      }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    // Delete the batch and all associated records (cascade delete)
    await prisma.$transaction([
      // Delete associated trades
      prisma.trade.deleteMany({
        where: { importBatchId: batchId }
      }),
      // Delete associated orders
      prisma.order.deleteMany({
        where: { importBatchId: batchId }
      }),
      // Delete the import batch itself
      prisma.importBatch.delete({
        where: { id: batchId }
      })
    ]);

    return NextResponse.json({ success: true, message: 'Import batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting import batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete import batch' },
      { status: 500 }
    );
  }
}