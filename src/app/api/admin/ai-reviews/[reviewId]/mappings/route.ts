import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { FormatApprovalService } from '@/lib/services/FormatApprovalService';
import { processUserOrders } from '@/lib/tradeBuilder';
import { z } from 'zod';

const MappingUpdateSchema = z.object({
  mappings: z.array(z.object({
    csvHeader: z.string(),
    orderField: z.string(),
    confidence: z.number().optional().default(1.0),
    isNew: z.boolean().optional().default(false),
    isModified: z.boolean().optional().default(false),
    combinedWith: z.array(z.string()).optional()
  })),
  adminNotes: z.string().optional(),
  approve: z.boolean().default(true)
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const user = await requireAdminAuth();
    const { reviewId } = await params;
    const body = await request.json();

    const { mappings, adminNotes, approve } = MappingUpdateSchema.parse(body);

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Get the current review
    const review = await prisma.aiIngestToCheck.findUnique({
      where: { id: reviewId },
      include: {
        brokerCsvFormat: true,
        csvUploadLog: true,
        importBatch: true
      }
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (!review.brokerCsvFormatId) {
      return NextResponse.json(
        { error: 'Review has no associated broker format' },
        { status: 400 }
      );
    }

    if (review.adminReviewStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'Review has already been processed' },
        { status: 400 }
      );
    }

    // Start transaction for all updates
    const result = await prisma.$transaction(async (tx) => {
      // Convert mappings array to the format expected by the broker format
      const newFieldMappings: Record<string, any> = {};
      const unmappedHeaders: string[] = [];

      // Get all original headers
      const allHeaders = review.csvUploadLog.originalHeaders;
      const mappedHeaderSet = new Set(mappings.map(m => m.csvHeader));

      // Group mappings by CSV header to support multiple fields per header
      const mappingGroups: Record<string, any[]> = {};

      mappings.forEach(mapping => {
        if (mapping.orderField === 'brokerMetadata' || mapping.orderField === '') {
          // This header should be metadata, not mapped
          if (!unmappedHeaders.includes(mapping.csvHeader)) {
            unmappedHeaders.push(mapping.csvHeader);
          }
        } else {
          if (!mappingGroups[mapping.csvHeader]) {
            mappingGroups[mapping.csvHeader] = [];
          }
          mappingGroups[mapping.csvHeader].push({
            field: mapping.orderField,
            confidence: mapping.confidence,
            adminReviewed: true,
            isNew: mapping.isNew,
            isModified: mapping.isModified,
            combinedWith: mapping.combinedWith || undefined
          });
        }
      });

      // Convert grouped mappings to the new format
      Object.entries(mappingGroups).forEach(([csvHeader, fieldMappings]) => {
        if (fieldMappings.length === 1) {
          // Single field - store in legacy format for backward compatibility
          const singleMapping = fieldMappings[0];
          newFieldMappings[csvHeader] = {
            field: singleMapping.field,
            confidence: singleMapping.confidence,
            adminReviewed: singleMapping.adminReviewed,
            isNew: singleMapping.isNew,
            isModified: singleMapping.isModified,
            ...(singleMapping.combinedWith && { combinedWith: singleMapping.combinedWith })
          };
        } else {
          // Multiple fields - store in new array format
          newFieldMappings[csvHeader] = {
            fields: fieldMappings.map(fm => fm.field),
            confidence: Math.max(...fieldMappings.map(fm => fm.confidence || 0)),
            adminReviewed: true,
            hasMultipleFields: true,
            // If any of the fields have combinedWith, store it
            ...(fieldMappings.some(fm => fm.combinedWith) && {
              combinedWith: fieldMappings.find(fm => fm.combinedWith)?.combinedWith
            })
          };
        }
      });

      // Add any headers not in mappings to unmapped (metadata)
      allHeaders.forEach(header => {
        if (!mappedHeaderSet.has(header)) {
          unmappedHeaders.push(header);
        }
      });

      // Update the broker CSV format with new mappings
      const updatedFormat = await tx.brokerCsvFormat.update({
        where: { id: review.brokerCsvFormatId! },
        data: {
          fieldMappings: newFieldMappings,
          confidence: 1.0, // Admin-reviewed has full confidence
          isApproved: true, // Always approve when admin reviews
          approvedBy: user.id,
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Update the AI review status
      // Determine if mappings were changed by checking for modified or new mappings
      const hasChanges = mappings.some(m => m.isModified || m.isNew);
      const reviewStatus = hasChanges ? 'CORRECTED' : 'APPROVED';

      const updatedReview = await tx.aiIngestToCheck.update({
        where: { id: reviewId },
        data: {
          adminReviewStatus: reviewStatus,
          adminNotes: adminNotes || '',
          adminReviewedAt: new Date(),
          adminReviewedBy: user.id,
          processingStatus: 'COMPLETED' // Always mark as completed when admin reviews
        }
      });

      // Create feedback items for all mappings to help train the AI
      const originalMappings = review.brokerCsvFormat!.fieldMappings as Record<string, any>;

      for (const mapping of mappings) {
        const originalMapping = originalMappings[mapping.csvHeader];
        const wasCorrect = !mapping.isModified && !mapping.isNew;

        let issueType = null;
        let comment = `Admin review: ${mapping.csvHeader} → ${mapping.orderField}`;

        if (mapping.isNew) {
          issueType = 'ADMIN_ADDED';
          comment = `Admin added new mapping: ${mapping.csvHeader} → ${mapping.orderField}`;
        } else if (mapping.isModified) {
          issueType = 'ADMIN_CORRECTED';
          comment = `Admin corrected: ${originalMapping?.field || 'unknown'} → ${mapping.orderField}`;
        } else if (originalMapping?.confidence < 0.7) {
          issueType = 'LOW_CONFIDENCE_APPROVED';
          comment = `Admin approved low confidence mapping: ${mapping.csvHeader} → ${mapping.orderField}`;
        }

        await tx.aiIngestFeedbackItem.create({
          data: {
            aiIngestCheckId: reviewId,
            csvHeader: mapping.csvHeader,
            aiMapping: originalMapping?.field || 'none',
            suggestedMapping: mapping.orderField,
            issueType,
            confidence: originalMapping?.confidence || 0.5,
            isCorrect: wasCorrect,
            comment,
            correctedBy: user.id,
            correctedAt: new Date()
          }
        });
      }

      // Handle headers that were moved to metadata
      for (const header of unmappedHeaders) {
        if (originalMappings[header]) {
          await tx.aiIngestFeedbackItem.create({
            data: {
              aiIngestCheckId: reviewId,
              csvHeader: header,
              aiMapping: originalMappings[header].field,
              suggestedMapping: 'brokerMetadata',
              issueType: 'MOVED_TO_METADATA',
              confidence: originalMappings[header].confidence || 0.5,
              isCorrect: false,
              comment: `Admin moved to metadata: ${header}`,
              correctedBy: user.id,
              correctedAt: new Date()
            }
          });
        }
      }

      // Update the import batch status since we're always completing the review
      if (review.importBatch) {
        await tx.importBatch.update({
          where: { id: review.importBatch.id },
          data: {
            status: 'COMPLETED',
            processingCompleted: new Date()
          }
        });
      }

      return {
        updatedReview,
        updatedFormat,
        mappingCount: mappings.length,
        metadataCount: unmappedHeaders.length
      };
    });

    // After transaction completes, migrate any staged orders since format is now approved
    try {
      console.log(`[AI Reviews] Format approved, triggering staged order migration for format ${review.brokerCsvFormatId}`);
      const approvalService = new FormatApprovalService();
      const migrationResult = await approvalService.processOrphanedStagingRecords(user.id);

      console.log(
        `[AI Reviews] Migration completed: ${migrationResult.processedCount} processed, ` +
        `${migrationResult.errorCount} errors`
      );

      // After successful migration, calculate trades from the newly migrated orders
      if (migrationResult.processedCount > 0 && review.importBatch?.userId) {
        try {
          console.log(`[AI Reviews] Starting trade calculation for user ${review.importBatch.userId}`);
          const trades = await processUserOrders(review.importBatch.userId);
          console.log(`[AI Reviews] Trade calculation completed: ${trades.length} trades processed`);
        } catch (tradeError) {
          console.error('[AI Reviews] Failed to calculate trades:', tradeError);
          // Don't fail the whole request if trade calculation fails - the orders are still migrated
        }
      }
    } catch (migrationError) {
      console.error('[AI Reviews] Failed to migrate staged orders:', migrationError);
      // Don't fail the whole request if migration fails - the format is still approved
    }

    return NextResponse.json({
      success: true,
      review: result.updatedReview,
      format: {
        id: result.updatedFormat.id,
        formatName: result.updatedFormat.formatName,
        confidence: result.updatedFormat.confidence
      },
      mappingCount: result.mappingCount,
      metadataCount: result.metadataCount,
      message: result.updatedReview.adminReviewStatus === 'CORRECTED' ? 'Mappings corrected and approved successfully' : 'Mappings approved successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

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

    console.error('Error updating AI review mappings:', error);
    return NextResponse.json(
      { error: 'Failed to update mappings' },
      { status: 500 }
    );
  }
}