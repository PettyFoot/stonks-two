import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    await requireAdminAuth();

    const { reviewId } = params;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Fetch the review with all related data
    const review = await prisma.aiIngestToCheck.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        brokerCsvFormat: {
          select: {
            id: true,
            formatName: true,
            description: true,
            headers: true,
            fieldMappings: true,
            sampleData: true,
            confidence: true
          }
        },
        csvUploadLog: {
          select: {
            filename: true,
            originalHeaders: true,
            rowCount: true,
            mappedHeaders: true
          }
        },
        feedbackItems: {
          select: {
            csvHeader: true,
            aiMapping: true,
            suggestedMapping: true,
            issueType: true,
            comment: true,
            confidence: true,
            isCorrect: true
          }
        }
      }
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Extract field mappings and format them for the frontend
    const fieldMappings = review.brokerCsvFormat.fieldMappings as Record<string, any>;
    const mappings: any[] = [];

    Object.entries(fieldMappings).forEach(([csvHeader, mapping]: [string, any]) => {
      // Handle new format with multiple fields
      if (mapping.fields && Array.isArray(mapping.fields)) {
        mapping.fields.forEach((field: string) => {
          mappings.push({
            csvHeader,
            orderField: field,
            confidence: mapping.confidence || 0.5,
            reasoning: mapping.reasoning || null,
            userCorrected: mapping.userCorrected || false,
            isMultiField: mapping.fields.length > 1
          });
        });
      } else {
        // Handle legacy format with single field
        mappings.push({
          csvHeader,
          orderField: mapping.field || mapping,
          confidence: mapping.confidence || 0.5,
          reasoning: mapping.reasoning || null,
          userCorrected: mapping.userCorrected || false,
          isMultiField: false
        });
      }
    });

    // Identify unmapped headers (metadata)
    const mappedHeaders = Object.keys(fieldMappings);
    const allHeaders = review.csvUploadLog.originalHeaders;
    const unmappedHeaders = allHeaders.filter(header => !mappedHeaders.includes(header));

    // Sample data for preview
    const sampleData = review.brokerCsvFormat.sampleData as Record<string, unknown>[] || [];

    const response = {
      review: {
        id: review.id,
        userId: review.userId,
        brokerCsvFormatId: review.brokerCsvFormatId,
        processingStatus: review.processingStatus,
        adminReviewStatus: review.adminReviewStatus,
        userIndicatedError: review.userIndicatedError,
        aiConfidence: review.aiConfidence,
        createdAt: review.createdAt,
        user: review.user,
        brokerCsvFormat: {
          id: review.brokerCsvFormat.id,
          formatName: review.brokerCsvFormat.formatName,
          description: review.brokerCsvFormat.description,
          confidence: review.brokerCsvFormat.confidence
        },
        csvUploadLog: review.csvUploadLog
      },
      mappings,
      unmappedHeaders,
      sampleData: sampleData.slice(0, 3), // First 3 rows for preview
      feedbackItems: review.feedbackItems
    };

    return NextResponse.json(response);
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
    console.error('Error fetching AI review details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI review details' },
      { status: 500 }
    );
  }
}