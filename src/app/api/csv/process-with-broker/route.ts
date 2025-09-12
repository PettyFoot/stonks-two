import { NextRequest, NextResponse } from 'next/server';
import { CsvIngestionService } from '@/lib/csvIngestion';
import { getCurrentUser } from '@/lib/auth0';
import { incrementUploadCount } from '@/lib/uploadRateLimiter';
import { z } from 'zod';

const ProcessWithBrokerSchema = z.object({
  importBatchId: z.string(),
  brokerName: z.string().min(1),
  accountTags: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { importBatchId, brokerName, accountTags } = ProcessWithBrokerSchema.parse(body);

    // Get the import batch to retrieve the file content
    const { prisma } = await import('@/lib/prisma');
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

    console.log(`🔄 Processing import batch ${importBatchId} with broker: ${brokerName}`);
    console.log(`📊 Batch contains ${importBatch.totalRecords} records`);
    
    // Check if we have temporary file content stored
    if (!importBatch.tempFileContent) {
      console.error('❌ No temporary file content found in import batch');
      return NextResponse.json({
        error: 'File content not found. The temporary data may have expired. Please re-upload the file.'
      }, { status: 400 });
    }

    console.log('✅ Found stored file content, proceeding with processing...');

    // Create ingestion service and upload log
    const { CsvIngestionService } = await import('@/lib/csvIngestion');
    const ingestionService = new CsvIngestionService();
    
    // Create upload log for tracking
    const uploadLog = await prisma.csvUploadLog.create({
      data: {
        userId: user.id,
        filename: importBatch.filename,
        originalHeaders: [], // Will be populated during processing
        rowCount: importBatch.totalRecords,
        uploadStatus: 'PARSING',
        parseMethod: 'AI_MAPPED',
        importBatchId: importBatch.id
      }
    });

    try {
      console.log('🚀 Starting CSV processing with OpenAI...');
      
      // Since we already have the file stored and just need to process it with the selected broker,
      // we can directly call processOpenAiCsv which will handle the AI mapping and return the result
      const result = await ingestionService.processOpenAiCsv(
        importBatch.tempFileContent,
        importBatch.filename,
        user.id,
        accountTags,
        uploadLog.id,
        importBatch.fileSize || 0,
        brokerName
      );

      // Clear the temporary file content after successful processing
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { tempFileContent: null }
      });

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

      return NextResponse.json(result);

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
    console.error('Process with broker error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Processing failed'
    }, { status: 500 });
  }
}