import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { CsvIngestionService } from '@/lib/csvIngestion';
import { z } from 'zod';

// Column mapping schema
const ColumnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetColumn: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const MappingRequestSchema = z.object({
  importBatchId: z.string(),
  mappings: z.array(ColumnMappingSchema),
  accountTags: z.array(z.string()).optional().default([]),
});

// Apply user-corrected mappings
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = MappingRequestSchema.parse(body);

    const ingestionService = new CsvIngestionService();
    
    // Retry import with user mappings
    const result = await ingestionService.retryImportWithUserMappings(
      validatedData.importBatchId,
      user.id,
      validatedData.mappings,
      validatedData.accountTags
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Mapping application error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Mapping application failed'
    }, { status: 500 });
  }
}

// Get import status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const importBatchId = searchParams.get('importBatchId');

    if (!importBatchId) {
      return NextResponse.json({ error: 'importBatchId is required' }, { status: 400 });
    }

    const ingestionService = new CsvIngestionService();
    const status = await ingestionService.getImportStatus(importBatchId, user.id);

    return NextResponse.json(status);

  } catch (error) {
    console.error('Get import status error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get import status'
    }, { status: 500 });
  }
}