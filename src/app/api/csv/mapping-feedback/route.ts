import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const MappingFeedbackSchema = z.object({
  aiIngestCheckId: z.string(),
  importBatchId: z.string(),
  correctedMappings: z.record(z.string(), z.string()).optional(), // { csvHeader: correctedField }
  overallSatisfaction: z.enum(['SATISFIED', 'NEEDS_IMPROVEMENT', 'POOR']).optional(),
  comments: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      aiIngestCheckId, 
      importBatchId, 
      correctedMappings = {}, 
      overallSatisfaction,
      comments 
    } = MappingFeedbackSchema.parse(body);

    // Verify the AiIngestToCheck record exists and belongs to the user
    const aiIngestCheck = await prisma.aiIngestToCheck.findFirst({
      where: { 
        id: aiIngestCheckId,
        userId: user.id,
        importBatchId 
      },
      include: {
        importBatch: true
      }
    });

    if (!aiIngestCheck) {
      return NextResponse.json({ 
        error: 'AI ingest check not found or access denied' 
      }, { status: 404 });
    }

    console.log(`📝 Processing mapping feedback for AiIngestCheck ${aiIngestCheckId}`);
    console.log(`🔧 User corrections: ${Object.keys(correctedMappings).length} mappings`);

    // Get the original AI mappings from the import batch
    const originalMappings = aiIngestCheck.importBatch.columnMappings as any;
    
    // Create feedback items for each correction made by the user
    const feedbackItems = [];
    for (const [csvHeader, correctedField] of Object.entries(correctedMappings)) {
      // Find the original AI mapping for this header
      const originalMapping = originalMappings?.[csvHeader];
      const aiMapping = originalMapping?.field || 'unknown';
      const aiConfidence = originalMapping?.confidence || 0;
      
      // Determine issue type based on the correction
      let issueType = 'WRONG_FIELD';
      if (aiConfidence < 0.5) {
        issueType = 'LOW_CONFIDENCE';
      } else if (correctedField === 'brokerMetadata') {
        issueType = 'SHOULD_BE_METADATA';
      }

      const feedbackItem = await prisma.aiIngestFeedbackItem.create({
        data: {
          aiIngestCheckId,
          csvHeader,
          aiMapping,
          suggestedMapping: correctedField,
          issueType,
          confidence: aiConfidence,
          originalValue: JSON.stringify(originalMapping),
          comment: `User corrected: ${aiMapping} → ${correctedField}`,
        }
      });
      
      feedbackItems.push(feedbackItem);
    }

    // Update the AiIngestToCheck record
    const wasSuccessful = Object.keys(correctedMappings).length === 0;
    await prisma.aiIngestToCheck.update({
      where: { id: aiIngestCheckId },
      data: {
        processingStatus: wasSuccessful ? 'COMPLETED' : 'FAILED',
        processedAt: new Date(),
        userIndicatedError: !wasSuccessful,
      }
    });

    // If user made corrections, update the broker format confidence
    if (feedbackItems.length > 0) {
      const brokerFormat = await prisma.brokerCsvFormat.findUnique({
        where: { id: aiIngestCheck.brokerCsvFormatId }
      });

      if (brokerFormat && brokerFormat.confidence > 0.3) {
        // Reduce confidence based on number of corrections
        const correctionRatio = feedbackItems.length / Object.keys(originalMappings || {}).length;
        const newConfidence = Math.max(0.1, brokerFormat.confidence * (1 - correctionRatio * 0.5));
        
        await prisma.brokerCsvFormat.update({
          where: { id: brokerFormat.id },
          data: { confidence: newConfidence }
        });
      }
    }

    console.log(`✅ Feedback processed: ${feedbackItems.length} corrections recorded`);

    return NextResponse.json({
      success: true,
      message: `Feedback recorded successfully`,
      correctionsCount: feedbackItems.length,
      aiIngestCheckId,
    });

  } catch (error) {
    console.error('Mapping feedback error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process feedback'
    }, { status: 500 });
  }
}