import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
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
    const { importBatchId, brokerName } = ProcessWithBrokerSchema.parse(body);

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

    
    // Check if we have temporary file content stored
    if (!importBatch.tempFileContent) {
      console.error('❌ No temporary file content found in import batch');
      return NextResponse.json({
        error: 'File content not found. The temporary data may have expired. Please re-upload the file.'
      }, { status: 400 });
    }



    // Create ingestion service
    const { CsvIngestionService } = await import('@/lib/csvIngestion');
    const ingestionService = new CsvIngestionService();

    try {
      
      // Use the new method to process the existing batch instead of creating a new one
      const result = await ingestionService.processExistingBatchWithAiMappings(
        importBatch.id,
        brokerName,
        user.id
      );

      // Don't clear tempFileContent yet - we need it for finalize-mappings
      // The file content will be cleared after user approves the mappings
      

      
      // Don't increment upload count yet - that happens after user approval

      return NextResponse.json(result);

    } catch (error) {
      console.error('💥 Processing failed:', error);
      
      // Update import batch status
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