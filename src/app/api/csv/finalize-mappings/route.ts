import { NextRequest, NextResponse } from 'next/server';
import { CsvIngestionService } from '@/lib/csvIngestion';
import { BrokerFormatService } from '@/lib/brokerFormatService';
import { getCurrentUser } from '@/lib/auth0';
import { incrementUploadCount } from '@/lib/uploadRateLimiter';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const FinalizeMappingsSchema = z.object({
  importBatchId: z.string(),
  correctedMappings: z.record(z.string(), z.string()).optional(), // Optional user corrections
  userApproved: z.boolean().default(true),
  reportError: z.boolean().optional().default(false),
}).strict();

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { importBatchId, correctedMappings, userApproved, reportError } = FinalizeMappingsSchema.parse(body);




    // Get the import batch with pending AI mappings
    const importBatch = await prisma.importBatch.findUnique({
      where: { 
        id: importBatchId,
        userId: user.id // Ensure user owns this batch
      }
    });

    if (!importBatch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    if (importBatch.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Import batch is not in pending state' 
      }, { status: 400 });
    }

    // Extract the pending AI mappings from columnMappings
    const pendingData = importBatch.columnMappings as any;
    if (!pendingData?.pendingAiMappings || !pendingData?.pendingBrokerName) {
      return NextResponse.json({
        error: 'No pending AI mappings found for this import batch'
      }, { status: 400 });
    }

    const aiMappings = pendingData.pendingAiMappings;
    const brokerName = pendingData.pendingBrokerName;
    const brokerMetadataFields = pendingData.pendingMetadata || [];
    const overallConfidence = pendingData.overallConfidence || 0.5;

    console.log('[CSV_FINALIZE] Processing mapping with AI:', {
      mappingsCount: Object.keys(aiMappings).length,
      brokerName,
      confidence: overallConfidence
    });

    if (!importBatch.tempFileContent) {
      return NextResponse.json({
        error: 'File content not found. The temporary data may have expired. Please re-upload the file.'
      }, { status: 400 });
    }

    // If user reported an error, record it but don't create the format
    if (reportError) {

      
      // Update the import batch to mark as failed
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED',
          errors: ['User reported error with AI-generated mappings']
        }
      });

      return NextResponse.json({
        success: false,
        message: 'AI mapping error reported. Thank you for the feedback.',
        importBatchId: importBatch.id
      });
    }

    if (!userApproved) {

      
      // Update the import batch to mark as cancelled
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED', // Using FAILED instead of CANCELLED
          errors: ['User cancelled import during mapping review']
        }
      });

      return NextResponse.json({
        success: false,
        message: 'Import cancelled by user',
        importBatchId: importBatch.id
      });
    }

    // Apply user corrections to the AI mappings
    const finalMappings = { ...aiMappings };
    if (correctedMappings && Object.keys(correctedMappings).length > 0) {
      for (const [csvHeader, newField] of Object.entries(correctedMappings)) {
        if (finalMappings[csvHeader]) {

          finalMappings[csvHeader] = {
            ...finalMappings[csvHeader],
            field: newField,
            confidence: 1.0, // User corrections have full confidence
            userCorrected: true
          };
        }
      }
    }

    // Now create the broker format with the approved (and possibly corrected) mappings
    const brokerFormatService = new BrokerFormatService();
    
    // Parse the CSV to get headers for format creation
    const { parse } = await import('csv-parse/sync');
    const records = parse(importBatch.tempFileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    const headers = Object.keys(records[0] as Record<string, unknown>);
    const sampleData = records.slice(0, 3) as Record<string, unknown>[];
    
    // Find and update the existing upload log instead of creating a new one
    const uploadLog = await prisma.csvUploadLog.findFirst({
      where: {
        userId: user.id,
        filename: importBatch.filename,
        importBatchId: null // Find the original log without importBatchId
      },
      orderBy: {
        createdAt: 'desc' // Get the most recent one
      }
    });

    if (!uploadLog) {
      throw new Error('Original upload log not found');
    }

    // Update the existing upload log with the import batch ID and final status
    await prisma.csvUploadLog.update({
      where: { id: uploadLog.id },
      data: {
        importBatchId: importBatch.id,
        uploadStatus: 'VALIDATED',
        parseMethod: 'AI_MAPPED',
        mappedHeaders: headers
      }
    });

    
    try {
      // Wrap critical database operations in a transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
      
      // Find or create the broker
      const broker = await brokerFormatService.findOrCreateBroker(brokerName);

      
      // Generate incremental format name
      const formatName = await brokerFormatService.generateFormatName(broker.id, broker.name);
      
      // Create the broker format
      const formatData = {
        brokerId: broker.id,
        formatName,
        description: `User-approved AI format for ${broker.name}${correctedMappings ? ' with corrections' : ''}`,
        headers,
        sampleData,
        fieldMappings: finalMappings,
        confidence: correctedMappings ? 1.0 : overallConfidence, // Full confidence if user corrected
        createdBy: user.id
      };

      const format = await brokerFormatService.createFormat(formatData);


      // Create AiIngestToCheck record for tracking - ALL imports go to admin review
      const hasUserCorrections = correctedMappings && Object.keys(correctedMappings).length > 0;
      const aiIngestCheck = await tx.aiIngestToCheck.create({
        data: {
          userId: user.id,
          brokerCsvFormatId: format.id,
          csvUploadLogId: uploadLog.id, // Use actual upload log ID
          importBatchId: importBatch.id,
          processingStatus: 'PENDING', // Using valid enum value
          userIndicatedError: false,
          aiConfidence: overallConfidence,
          adminReviewStatus: 'PENDING', // Always set to pending for admin review
          adminNotes: hasUserCorrections ? `User made ${Object.keys(correctedMappings).length} corrections to AI mappings` : 'User approved AI mappings as-is'
        }
      });


      // Record feedback for ALL AI mappings - both corrected and uncorrected
      const correctedFieldCount = correctedMappings ? Object.keys(correctedMappings).length : 0;

      // Create feedback items for ALL fields to send to admin review
      for (const [csvHeader, originalMapping] of Object.entries(aiMappings)) {
        if (!originalMapping) continue; // Skip if no original mapping found

        // Type assertion since we know the structure from OpenAI service
        const mapping = originalMapping as { field: string; confidence: number; [key: string]: any };
        const aiConfidence = mapping.confidence || 0;

        // Check if this field was corrected by the user
        const wasCorrectedByUser = correctedMappings && correctedMappings[csvHeader];
        const finalField = wasCorrectedByUser ? correctedMappings[csvHeader] : mapping.field;

        // Determine issue type based on correction status and confidence
        let issueType = 'accepted'; // Default for uncorrected mappings
        let comment = `AI mapping accepted by user: ${mapping.field}`;

        if (wasCorrectedByUser) {
          issueType = 'user_corrected'; // User made a correction
          comment = `User corrected: ${mapping.field} → ${finalField}`;

          if (aiConfidence < 0.5) {
            issueType = 'low_confidence_corrected';
          } else if (finalField === 'brokerMetadata') {
            issueType = 'should_be_metadata';
          }
        } else if (aiConfidence < 0.5) {
          issueType = 'low_confidence_accepted';
          comment = `Low confidence AI mapping accepted: ${mapping.field} (${(aiConfidence * 100).toFixed(1)}%)`;
        } else if (aiConfidence < 0.8) {
          issueType = 'medium_confidence_accepted';
          comment = `Medium confidence AI mapping accepted: ${mapping.field} (${(aiConfidence * 100).toFixed(1)}%)`;
        }

        await tx.aiIngestFeedbackItem.create({
          data: {
            aiIngestCheckId: aiIngestCheck.id,
            csvHeader,
            aiMapping: mapping.field,
            suggestedMapping: finalField,
            issueType,
            confidence: aiConfidence,
            isCorrect: !wasCorrectedByUser, // True if user didn't correct it, false if they did
            originalValue: JSON.stringify(mapping),
            comment,
          }
        });
      }

      const correctionCount = correctedMappings ? Object.keys(correctedMappings).length : 0;


      // Process the CSV - since newly created formats are unapproved by default, route to staging
      const brokerDetection = {
        broker: broker,
        format: format,
        confidence: 1.0,
        isExactMatch: true
      };

      // Create ingestion service
      const ingestionService = new CsvIngestionService();

      // Determine broker type for the import batch
      const brokerType = (ingestionService as any).getBrokerTypeFromName(broker.name);

      // Update the existing import batch for staging instead of creating a new one
      await tx.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'PENDING', // Status for staging
          brokerType: brokerType,
          importType: 'CUSTOM',
          aiMappingUsed: false,
          mappingConfidence: 1.0,
          columnMappings: format.fieldMappings as any,
          userReviewRequired: true, // Requires admin review
          tempFileContent: null, // Clear after processing
        }
      });

      // Since this is a newly created format (isApproved = false by default),
      // we should stage the orders using the EXISTING import batch
      let processingResult;
      if (!format.isApproved) {
        // Use OrderStagingService directly to avoid creating duplicate ImportBatch
        const OrderStagingService = (await import('@/lib/services/OrderStagingService')).OrderStagingService;
        const stagingService = new OrderStagingService();
        const stagingResult = await stagingService.stageOrders(
          records,
          format,
          importBatch, // Use existing ImportBatch
          user.id
        );

        // Detect or create upload session for tracking
        const session = await ingestionService.detectOrCreateSession(
          user.id,
          importBatch.filename,
          records.length
        );

        // Get session attempt count
        const sessionAttempts = await ingestionService.getSessionAttemptCount(session.id);

        // Calculate if session is complete
        const totalValidRows = stagingResult.stagedCount;
        const isComplete = totalValidRows >= session.expectedRowCount;

        // Update import batch with staging results AND session info
        await tx.importBatch.update({
          where: { id: importBatch.id },
          data: {
            status: 'PENDING',
            successCount: stagingResult.stagedCount,
            errorCount: stagingResult.errorCount,
            errors: stagingResult.errors.length > 0 ? stagingResult.errors : undefined,
            userReviewRequired: true,
            // Session tracking fields
            uploadSessionId: session.id,
            expectedRowCount: session.expectedRowCount,
            completedRowCount: session.previousCompleted + stagingResult.stagedCount,
            isSessionComplete: isComplete,
            sessionAttempts: sessionAttempts,
            sessionStatus: isComplete ? 'COMPLETED' : 'ACTIVE'
          }
        });

        processingResult = {
          success: true,
          importBatchId: importBatch.id,
          importType: 'CUSTOM' as const,
          totalRecords: records.length,
          successCount: stagingResult.stagedCount,
          errorCount: stagingResult.errorCount,
          errors: stagingResult.errors,
          requiresUserReview: false,
          requiresBrokerSelection: false,
          staged: true,
          stagedCount: stagingResult.stagedCount,
          requiresApproval: true,
          pendingFormatName: format.formatName,
          estimatedApprovalTime: '1-2 business days',
          message: 'New broker format uploaded, waiting for admin review.',
          isNewFormat: true,
          orderIds: [], // No orders created yet, they're staged
          // Session tracking fields
          sessionComplete: isComplete,
          sessionProgress: `${totalValidRows}/${session.expectedRowCount}`,
          sessionAttempt: sessionAttempts
        };
      } else {
        // For approved formats, process normally
        processingResult = await (ingestionService as any).processKnownBrokerFormat(
            importBatch.tempFileContent,
            importBatch.filename,
            user.id,
            [], // account tags
            uploadLog.id,
            importBatch.fileSize || 0,
            brokerDetection
          );
      }

      // Update AiIngestToCheck with orderIds if processing was successful
      if (processingResult.orderIds && processingResult.orderIds.length > 0) {
        await tx.aiIngestToCheck.update({
          where: { id: aiIngestCheck.id },
          data: {
            orderIds: processingResult.orderIds,
            processingStatus: 'COMPLETED',
            processedAt: new Date()
          }
        });

      } else {

      }


      if (processingResult.errorCount > 0) {

      }

      // Return all the data needed for the response
      return {
        processingResult,
        format,
        aiIngestCheck,
        uploadLog
      };
    }, {
      maxWait: 60000, // 60 seconds
      timeout: 300000, // 5 minutes
      });


      // Update format usage statistics (outside transaction since it's not critical)
      if (result.processingResult.successCount > 0) {
        try {
          await brokerFormatService.updateFormatUsage(result.format.id, true);
        } catch (error) {
          console.error('⚠️ Failed to update format usage statistics:', error);
          // Don't fail the operation for this
        }
      }

      // Record staging metrics (outside transaction to avoid deadlocks)
      if (result.processingResult.staged) {
        try {
          const StagingMonitor = (await import('@/lib/monitoring/StagingMonitor')).StagingMonitor;
          const duration = Date.now() - Date.parse(importBatch.createdAt.toISOString());
          await StagingMonitor.trackStaging(
            result.format.id,
            result.processingResult.successCount > 0,
            duration,
            result.processingResult.totalRecords,
            result.processingResult.errorCount
          );
        } catch (error) {
          console.error('⚠️ Failed to record staging metrics:', error);
          // Don't fail the operation for monitoring issues
        }
      }

      // ONLY increment upload count if session is complete
      // This ensures partial uploads don't count toward daily limit
      if (result.processingResult.success && result.processingResult.sessionComplete) {
        try {
          await incrementUploadCount(user.id);
          console.log(`[Upload Count] Incremented for user ${user.id}. Session complete.`);
        } catch (error) {
          console.error('Failed to increment upload count:', error);
          // Don't fail the whole operation for counting issues
        }
      } else if (result.processingResult.success && !result.processingResult.sessionComplete) {
        console.log(`[Upload Count] NOT incremented. Session incomplete.`);
      }

      return NextResponse.json({
        ...result.processingResult,
        brokerFormatCreated: result.format.formatName,
        aiIngestCheckId: result.aiIngestCheck.id
      });

    } catch (transactionError) {
      console.error('💥 Transaction failed:', transactionError);
      
      // Update uploadLog to mark it as failed
      try {
        await prisma.csvUploadLog.update({
          where: { id: uploadLog.id },
          data: {
            uploadStatus: 'FAILED',
            errorMessage: transactionError instanceof Error ? transactionError.message : 'Transaction failed'
          }
        });
      } catch (updateError) {
        console.error('⚠️ Failed to update uploadLog status:', updateError);
      }

      // Re-throw the error to be caught by the outer catch block
      throw transactionError;
    }

  } catch (error) {
    console.error('Finalize mappings error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Finalization failed'
    }, { status: 500 });
  }
}