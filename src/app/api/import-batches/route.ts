import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

// GET - List all import batches for a user (or all users if admin)
export async function GET() {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // If user is admin, get all import batches with user info
    // If regular user, get only their own batches
    const whereClause = user.isAdmin ? {} : { userId: user.id };

    const importBatches = await prisma.importBatch.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            trades: true,
            orders: true
          }
        },
        // Include user info for admins
        ...(user.isAdmin && {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        })
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

    // Verify the batch belongs to the user (or user is admin)
    const whereClause = user.isAdmin
      ? { id: batchId }
      : { id: batchId, userId: user.id };

    const batch = await prisma.importBatch.findFirst({
      where: whereClause
    });

    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    // Check if this is an AI-mapped import
    const aiIngestCheck = await prisma.aiIngestToCheck.findUnique({
      where: { importBatchId: batchId },
      include: {
        brokerCsvFormat: true
      }
    });

    // Delete the batch and all associated records in a transaction
    await prisma.$transaction(async (tx) => {
      // If this is an AI-mapped import, handle additional cleanup
      if (aiIngestCheck) {
        console.log(`[DELETE] AI-mapped import detected for batch ${batchId}`);

        // 1. Delete AiIngestToCheck (this will cascade delete AiIngestFeedbackItem)
        await tx.aiIngestToCheck.delete({
          where: { id: aiIngestCheck.id }
        });
        console.log(`[DELETE] Deleted AiIngestToCheck and feedback items`);

        // 2. Delete OrderStaging entries for this import
        const deletedStaging = await tx.orderStaging.deleteMany({
          where: { importBatchId: batchId }
        });
        console.log(`[DELETE] Deleted ${deletedStaging.count} OrderStaging entries`);

        // 3. Check if BrokerCsvFormat is orphaned and delete if needed
        if (aiIngestCheck.brokerCsvFormatId) {
          const otherReferences = await tx.aiIngestToCheck.findFirst({
            where: {
              brokerCsvFormatId: aiIngestCheck.brokerCsvFormatId,
              id: { not: aiIngestCheck.id } // Exclude the one we just deleted (paranoid check)
            }
          });

          const otherStagingReferences = await tx.orderStaging.findFirst({
            where: {
              brokerCsvFormatId: aiIngestCheck.brokerCsvFormatId
            }
          });

          // If no other imports use this format, delete it
          if (!otherReferences && !otherStagingReferences) {
            await tx.brokerCsvFormat.delete({
              where: { id: aiIngestCheck.brokerCsvFormatId }
            });
            console.log(`[DELETE] Deleted orphaned BrokerCsvFormat ${aiIngestCheck.brokerCsvFormatId}`);
          } else {
            console.log(`[DELETE] Keeping BrokerCsvFormat ${aiIngestCheck.brokerCsvFormatId} (still in use)`);
          }
        }

        // 4. Delete CsvUploadLog entries for this import
        const deletedLogs = await tx.csvUploadLog.deleteMany({
          where: { importBatchId: batchId }
        });
        console.log(`[DELETE] Deleted ${deletedLogs.count} CsvUploadLog entries`);
      }

      // 5. Delete associated trades
      const deletedTrades = await tx.trade.deleteMany({
        where: { importBatchId: batchId }
      });
      console.log(`[DELETE] Deleted ${deletedTrades.count} trades`);

      // 6. Delete associated orders
      const deletedOrders = await tx.order.deleteMany({
        where: { importBatchId: batchId }
      });
      console.log(`[DELETE] Deleted ${deletedOrders.count} orders`);

      // 7. Delete the import batch itself
      await tx.importBatch.delete({
        where: { id: batchId }
      });
      console.log(`[DELETE] Deleted ImportBatch ${batchId}`);
    });

    return NextResponse.json({
      success: true,
      message: 'Import batch deleted successfully',
      deletedAiMapping: !!aiIngestCheck
    });
  } catch (error) {
    console.error('Error deleting import batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete import batch' },
      { status: 500 }
    );
  }
}