import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { AdminReviewStatus } from '@prisma/client';
import { emailService } from '@/lib/email/emailService';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth();
    
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const where: { adminReviewStatus?: AdminReviewStatus | { in: AdminReviewStatus[] } } = {};
    
    switch (filter) {
      case 'pending':
        where.adminReviewStatus = AdminReviewStatus.PENDING;
        break;
      case 'reviewed':
        where.adminReviewStatus = {
          in: [AdminReviewStatus.APPROVED, AdminReviewStatus.CORRECTED, AdminReviewStatus.DENIED]
        };
        break;
    }

    const reviews = await prisma.aiIngestToCheck.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        brokerCsvFormat: {
          select: {
            formatName: true,
            description: true
          }
        },
        csvUploadLog: {
          select: {
            filename: true,
            originalHeaders: true,
            rowCount: true
          }
        }
      },
      orderBy: [
        {
          adminReviewStatus: 'asc' // PENDING first
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    console.error('Error fetching AI reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI reviews' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdminAuth();
    const { reviewId, adminReviewStatus, adminNotes, denialReason, denialMessage, assetType } = await req.json();

    if (!reviewId || !adminReviewStatus) {
      return NextResponse.json(
        { error: 'Review ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['PENDING', 'IN_REVIEW', 'APPROVED', 'CORRECTED', 'DENIED', 'ESCALATED'];
    if (!validStatuses.includes(adminReviewStatus)) {
      return NextResponse.json(
        { error: 'Invalid review status' },
        { status: 400 }
      );
    }

    // Validate denial fields when status is DENIED
    if (adminReviewStatus === 'DENIED') {
      if (!denialReason) {
        return NextResponse.json(
          { error: 'Denial reason is required when denying a format' },
          { status: 400 }
        );
      }
    }

    // Handle DENIED status with transaction-based cleanup
    if (adminReviewStatus === 'DENIED') {
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Get the review and all related data
        const review = await tx.aiIngestToCheck.findUnique({
          where: { id: reviewId },
          select: {
            importBatchId: true,
            csvUploadLogId: true,
            userId: true,
            brokerCsvFormatId: true
          }
        });

        if (!review) {
          throw new Error('Review not found');
        }

        // Step 2: Find ALL ImportBatches related to this CSV upload
        // This catches duplicate batches created during the upload flow
        const relatedImportBatches = await tx.importBatch.findMany({
          where: {
            csvUploadLogs: {
              some: {
                id: review.csvUploadLogId
              }
            }
          },
          select: {
            id: true,
            filename: true,
            totalRecords: true
          }
        });

        const importBatchIds = relatedImportBatches.map(batch => batch.id);

        console.log('Found related import batches for cleanup:', {
          csvUploadLogId: review.csvUploadLogId,
          importBatchIds,
          count: importBatchIds.length
        });

        // Step 3: Safety check - verify no finalized orders exist in ANY batch
        const existingOrdersCount = await tx.order.count({
          where: {
            importBatchId: { in: importBatchIds }
          }
        });

        if (existingOrdersCount > 0) {
          console.warn('WARNING: Upload has existing finalized orders!', {
            reviewId,
            importBatchIds,
            orderCount: existingOrdersCount
          });
          // Still proceed but log warning - admin may be rejecting after partial processing
        }

        // Step 4: Delete OrderStaging from ALL related ImportBatches
        const deletedStaging = await tx.orderStaging.deleteMany({
          where: {
            importBatchId: { in: importBatchIds }
          }
        });

        console.log('Deleted staging orders:', {
          deletedCount: deletedStaging.count,
          fromBatches: importBatchIds
        });

        // Step 5: Explicitly delete AiIngestFeedbackItems
        // CASCADE only works on DELETE, not UPDATE, so we need to delete these manually
        const deletedFeedbackItems = await tx.aiIngestFeedbackItem.deleteMany({
          where: {
            aiIngestCheckId: reviewId
          }
        });

        console.log('Deleted feedback items:', deletedFeedbackItems.count);

        // Step 5.5: Delete BrokerCsvFormat if it's not approved and only used by this ingest
        if (review.brokerCsvFormatId) {
          const format = await tx.brokerCsvFormat.findUnique({
            where: { id: review.brokerCsvFormatId },
            select: {
              isApproved: true,
              formatName: true,
              _count: {
                select: {
                  aiIngestChecks: true
                }
              }
            }
          });

          // Only delete if:
          // 1. Format exists
          // 2. Format is not approved (isApproved = false)
          // 3. This is the only ingest check using it (count = 1)
          if (format && !format.isApproved && format._count.aiIngestChecks === 1) {
            const deletedFormat = await tx.brokerCsvFormat.delete({
              where: { id: review.brokerCsvFormatId }
            });

            console.log('Deleted unapproved broker format:', {
              formatId: deletedFormat.id,
              formatName: deletedFormat.formatName,
              reason: 'Ingest rejected and format not approved'
            });
          } else if (format) {
            console.log('Skipped broker format deletion:', {
              formatId: review.brokerCsvFormatId,
              isApproved: format.isApproved,
              ingestCount: format._count.aiIngestChecks,
              reason: format.isApproved
                ? 'Format is already approved'
                : `Format is used by ${format._count.aiIngestChecks} ingest checks`
            });
          }
        }

        // Step 6: Update AiIngestToCheck with denial info AND processingStatus
        const updatedReview = await tx.aiIngestToCheck.update({
          where: { id: reviewId },
          data: {
            adminReviewStatus: 'DENIED',
            processingStatus: 'REJECTED',
            denialReason,
            denialMessage: denialMessage || null,
            deniedAt: new Date(),
            adminNotes,
            adminReviewedAt: new Date(),
            adminReviewedBy: user.id
          },
          select: {
            id: true,
            adminReviewStatus: true,
            processingStatus: true,
            adminNotes: true,
            adminReviewedAt: true,
            denialReason: true,
            denialMessage: true,
            deniedAt: true,
            importBatchId: true,
            user: {
              select: {
                email: true,
                name: true
              }
            },
            importBatch: {
              select: {
                filename: true,
                totalRecords: true
              }
            }
          }
        });

        // Step 7: Update ALL related ImportBatches to FAILED status
        await tx.importBatch.updateMany({
          where: {
            id: { in: importBatchIds }
          },
          data: {
            status: 'FAILED',
            errors: {
              type: 'ADMIN_REJECTION',
              reason: denialReason,
              message: denialMessage || null,
              assetType: assetType || null,
              rejectedAt: new Date().toISOString(),
              rejectedBy: user.id
            }
          }
        });

        return {
          updatedReview,
          deletedStagingCount: deletedStaging.count,
          deletedFeedbackItemsCount: deletedFeedbackItems.count,
          importBatchIds: importBatchIds,
          cleanedBatchCount: importBatchIds.length
        };
      });

      // Log cleanup for audit trail
      console.log('Upload rejection cleanup completed:', {
        reviewId,
        importBatchIds: result.importBatchIds,
        cleanedBatchCount: result.cleanedBatchCount,
        userId: result.updatedReview.user.email,
        filename: result.updatedReview.importBatch.filename,
        deletedStagingOrders: result.deletedStagingCount,
        deletedFeedbackItems: result.deletedFeedbackItemsCount,
        denialReason,
        timestamp: new Date().toISOString()
      });

      // Send denial email
      try {
        await emailService.sendFormatDenialEmail({
          userName: result.updatedReview.user.name || result.updatedReview.user.email,
          userEmail: result.updatedReview.user.email,
          supportEmail: process.env.EMAIL_FROM || 'support@tradevoyageranalytics.com',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tradevoyageranalytics.com',
          denialReason: denialReason,
          denialMessage: denialMessage || undefined,
          assetType: assetType || undefined
        });

        console.log('Format denial email sent to:', result.updatedReview.user.email);
      } catch (emailError) {
        console.error('Failed to send denial email, but denial was recorded:', emailError);
      }

      return NextResponse.json({
        review: result.updatedReview,
        cleanup: {
          deletedStagingOrders: result.deletedStagingCount,
          deletedFeedbackItems: result.deletedFeedbackItemsCount,
          cleanedImportBatches: result.cleanedBatchCount
        }
      });
    }

    // Handle non-DENIED status updates (APPROVED, CORRECTED, DISMISSED, etc.)
    const updateData: any = {
      adminReviewStatus,
      adminNotes,
      adminReviewedAt: new Date(),
      adminReviewedBy: user.id
    };

    const updatedReview = await prisma.aiIngestToCheck.update({
      where: { id: reviewId },
      data: updateData,
      select: {
        id: true,
        adminReviewStatus: true,
        adminNotes: true,
        adminReviewedAt: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    console.error('Error updating AI review:', error);
    return NextResponse.json(
      { error: 'Failed to update AI review' },
      { status: 500 }
    );
  }
}