import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const MappingUpdateSchema = z.object({
  mappings: z.array(z.object({
    csvHeader: z.string(),
    orderField: z.string(),
    confidence: z.number().optional().default(1.0),
    isNew: z.boolean().optional().default(false),
    isModified: z.boolean().optional().default(false)
  })),
  adminNotes: z.string().optional(),
  approve: z.boolean().default(true)
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const user = await requireAdminAuth();
    const { reviewId } = params;
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
            isModified: mapping.isModified
          });
        }
      });

      // Convert grouped mappings to the new format
      Object.entries(mappingGroups).forEach(([csvHeader, fieldMappings]) => {
        if (fieldMappings.length === 1) {
          // Single field - store in legacy format for backward compatibility
          newFieldMappings[csvHeader] = fieldMappings[0];
        } else {
          // Multiple fields - store in new array format
          newFieldMappings[csvHeader] = {
            fields: fieldMappings.map(fm => fm.field),
            confidence: Math.max(...fieldMappings.map(fm => fm.confidence || 0)),
            adminReviewed: true,
            hasMultipleFields: true
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
        where: { id: review.brokerCsvFormatId },
        data: {
          fieldMappings: newFieldMappings,
          confidence: 1.0, // Admin-reviewed has full confidence
          updatedAt: new Date()
        }
      });

      // Update the AI review status
      const reviewStatus = approve ? 'APPROVED' : 'CORRECTED';
      const updatedReview = await tx.aiIngestToCheck.update({
        where: { id: reviewId },
        data: {
          adminReviewStatus: reviewStatus,
          adminNotes: adminNotes || '',
          adminReviewedAt: new Date(),
          adminReviewedBy: user.id,
          processingStatus: approve ? 'COMPLETED' : 'PENDING'
        }
      });

      // Create feedback items for all mappings to help train the AI
      const originalMappings = review.brokerCsvFormat.fieldMappings as Record<string, any>;

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

      // If approved, update the import batch status as well
      if (approve && review.importBatch) {
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
      message: approve ? 'Mappings approved successfully' : 'Mappings corrected successfully'
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