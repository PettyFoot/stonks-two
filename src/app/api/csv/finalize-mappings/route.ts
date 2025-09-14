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

    console.log('🎯 Finalizing AI mappings for import batch:', importBatchId);
    console.log('✅ User approved:', userApproved);
    console.log('🔧 User corrections:', correctedMappings ? Object.keys(correctedMappings).length : 0);
    console.log('❌ User reported error:', reportError);

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

    console.log('📊 Retrieved pending mappings:', {
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
      console.log('❌ User reported error with AI mappings');
      
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
      console.log('❌ User did not approve mappings');
      
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
      console.log('🔧 Applying user corrections...');
      for (const [csvHeader, newField] of Object.entries(correctedMappings)) {
        if (finalMappings[csvHeader]) {
          console.log(`  - Correcting "${csvHeader}": ${finalMappings[csvHeader].field} → ${newField}`);
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
    console.log('🏗️ Creating broker format with approved mappings...');
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
    
    // Create upload log BEFORE transaction so it exists for processKnownBrokerFormat
    console.log('📝 Creating CSV upload log before transaction...');
    const uploadLog = await prisma.csvUploadLog.create({
      data: {
        userId: user.id,
        filename: importBatch.filename,
        originalHeaders: headers,
        rowCount: importBatch.totalRecords,
        uploadStatus: 'PARSING',
        parseMethod: 'AI_MAPPED', // Using valid enum value
        importBatchId: importBatch.id
      }
    });
    console.log(`✅ Created CSV upload log: ${uploadLog.id}`);
    
    try {
      // Wrap critical database operations in a transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
      console.log('📦 Starting database transaction...');
      
      // Find or create the broker
      const broker = await brokerFormatService.findOrCreateBroker(brokerName);
      console.log(`✅ Found/created broker: ${broker.name} (ID: ${broker.id})`);
      
      // Generate incremental format name
      const formatName = await brokerFormatService.generateFormatName(broker.id, broker.name);
      console.log(`📝 Generated format name: ${formatName}`);
      
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
      console.log(`✅ Created broker format: ${format.formatName} (ID: ${format.id})`);

      // Create AiIngestToCheck record for tracking
      const aiIngestCheck = await tx.aiIngestToCheck.create({
        data: {
          userId: user.id,
          brokerCsvFormatId: format.id,
          csvUploadLogId: uploadLog.id, // Use actual upload log ID
          importBatchId: importBatch.id,
          processingStatus: 'PENDING', // Using valid enum value
          userIndicatedError: false,
          aiConfidence: overallConfidence
        }
      });
      console.log(`✅ Created AiIngestToCheck record: ${aiIngestCheck.id}`);

      // Record feedback only for AI mappings that had user corrections
      const correctedFieldCount = correctedMappings ? Object.keys(correctedMappings).length : 0;
      console.log(`📝 Recording feedback for ${correctedFieldCount} user corrections (out of ${Object.keys(aiMappings).length} total AI mappings)`);

      // Only create feedback items for fields that were actually corrected by the user
      if (correctedMappings && Object.keys(correctedMappings).length > 0) {
        for (const [csvHeader, correctedField] of Object.entries(correctedMappings)) {
          const originalMapping = aiMappings[csvHeader];
          if (!originalMapping) continue; // Skip if no original mapping found

          // Type assertion since we know the structure from OpenAI service
          const mapping = originalMapping as { field: string; confidence: number; [key: string]: any };
          const aiConfidence = mapping.confidence || 0;

          // Determine issue type based on the correction
          let issueType = 'WRONG_FIELD'; // Default for user corrections
          if (aiConfidence < 0.5) {
            issueType = 'LOW_CONFIDENCE';
          } else if (correctedField === 'brokerMetadata') {
            issueType = 'SHOULD_BE_METADATA';
          }

          const comment = `User corrected: ${mapping.field} → ${correctedField}`;

          await tx.aiIngestFeedbackItem.create({
            data: {
              aiIngestCheckId: aiIngestCheck.id,
              csvHeader,
              aiMapping: mapping.field,
              suggestedMapping: correctedField,
              issueType,
              confidence: aiConfidence,
              isCorrect: false, // User corrected it, so AI was wrong
              originalValue: JSON.stringify(mapping),
              comment,
            }
          });
        }
      } else {
        console.log('📝 No user corrections to record - user accepted all AI mappings as-is');
      }

      const correctionCount = correctedMappings ? Object.keys(correctedMappings).length : 0;
      console.log(`✅ Created ${correctionCount} feedback items for user corrections`);

      // Process the CSV with the approved mappings using the known broker format
      console.log('🚀 Processing CSV with approved mappings...');
      const brokerDetection = {
        broker: broker,
        format: format,
        confidence: 1.0,
        isExactMatch: true
      };

      // Create ingestion service (note: this will create orders inside the transaction)
      const ingestionService = new CsvIngestionService();
      
      // Use the processKnownBrokerFormat method since we now have a confirmed format
      const processingResult = await (ingestionService as any).processKnownBrokerFormat(
        importBatch.tempFileContent,
        importBatch.filename,
        user.id,
        [], // account tags - we can extract these from the original request if needed
        uploadLog.id,
        importBatch.fileSize || 0,
        brokerDetection
      );
      console.log(`📊 Processing result: ${processingResult.successCount} successful, ${processingResult.errorCount} errors`);

      // Clear the temporary file content after successful processing
      await tx.importBatch.update({
        where: { id: importBatch.id },
        data: { 
          tempFileContent: null,
          columnMappings: {} as any // Clear the pending mappings
        }
      });
      console.log('🗑️ Cleared temporary file content from ImportBatch');

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
        console.log(`✅ Updated AiIngestToCheck with ${processingResult.orderIds.length} order IDs`);
      } else {
        console.log('⚠️ No order IDs to update in AiIngestToCheck');
      }

      console.log('🎉 All database operations completed successfully in transaction!');
      console.log(`✅ ${processingResult.successCount} records imported`);
      if (processingResult.errorCount > 0) {
        console.log(`⚠️ ${processingResult.errorCount} records had errors`);
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

      console.log('📦 Transaction completed successfully!');

      // Update format usage statistics (outside transaction since it's not critical)
      if (result.processingResult.successCount > 0) {
        try {
          await brokerFormatService.updateFormatUsage(result.format.id, true);
          console.log('📈 Updated format usage statistics');
        } catch (error) {
          console.error('⚠️ Failed to update format usage statistics:', error);
          // Don't fail the operation for this
        }
      }

      // Increment upload count after successful processing (outside transaction)
      if (result.processingResult.success && result.processingResult.successCount > 0) {
        try {
          await incrementUploadCount(user.id);
          console.log(`✅ Upload count incremented for user ${user.id}`);
        } catch (error) {
          console.error('Failed to increment upload count:', error);
          // Don't fail the whole operation for counting issues
        }
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
        console.log('📝 Updated uploadLog status to FAILED');
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