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
    
    // Find or create the broker
    const broker = await brokerFormatService.findOrCreateBroker(brokerName);
    
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
    
    // Create the broker format
    const formatData = {
      brokerId: broker.id,
      formatName: `${broker.name} Format ${new Date().toISOString().split('T')[0]} (User Approved)`,
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
    const aiIngestCheck = await prisma.aiIngestToCheck.create({
      data: {
        userId: user.id,
        brokerCsvFormatId: format.id,
        csvUploadLogId: importBatch.id, // Use importBatch.id as placeholder for now
        importBatchId: importBatch.id,
        processingStatus: 'PENDING', // Using valid enum value
        userIndicatedError: false,
        aiConfidence: overallConfidence
      }
    });

    // Create ingestion service and process the CSV with the approved mappings
    console.log('🚀 Processing CSV with approved mappings...');
    const ingestionService = new CsvIngestionService();
    
    // Create upload log for tracking
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

    try {
      // Process the CSV with the approved mappings using the known broker format
      const brokerDetection = {
        broker: broker,
        format: format,
        confidence: 1.0,
        isExactMatch: true
      };

      // Use the processKnownBrokerFormat method since we now have a confirmed format
      const result = await (ingestionService as any).processKnownBrokerFormat(
        importBatch.tempFileContent,
        importBatch.filename,
        user.id,
        [], // account tags - we can extract these from the original request if needed
        uploadLog.id,
        importBatch.fileSize || 0,
        brokerDetection
      );

      // Clear the temporary file content after successful processing
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { 
          tempFileContent: null,
          columnMappings: {} as any // Clear the pending mappings
        }
      });

      // Update format usage statistics
      if (result.successCount > 0) {
        await brokerFormatService.updateFormatUsage(format.id, true);
      }

      console.log('🎉 Processing completed successfully!');
      console.log(`✅ ${result.successCount} records imported`);
      if (result.errorCount > 0) {
        console.log(`⚠️ ${result.errorCount} records had errors`);
      }

      // Increment upload count after successful processing
      if (result.success && result.successCount > 0) {
        try {
          await incrementUploadCount(user.id);
          console.log(`✅ Upload count incremented for user ${user.id}`);
        } catch (error) {
          console.error('Failed to increment upload count:', error);
          // Don't fail the whole operation for counting issues
        }
      }

      return NextResponse.json({
        ...result,
        brokerFormatCreated: format.formatName,
        aiIngestCheckId: aiIngestCheck.id
      });

    } catch (error) {
      console.error('💥 Processing failed:', error);
      
      // Update upload log and import batch status
      await prisma.csvUploadLog.update({
        where: { id: uploadLog.id },
        data: {
          uploadStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Processing failed'
        }
      });
      
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { 
          status: 'FAILED',
          errors: [error instanceof Error ? error.message : 'Processing failed']
        }
      });

      throw error;
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