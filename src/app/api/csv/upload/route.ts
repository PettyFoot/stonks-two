import { NextRequest, NextResponse } from 'next/server';
import { CsvIngestionService, FILE_SIZE_LIMITS } from '@/lib/csvIngestion';
import { getCurrentUser } from '@/lib/auth0';
import { checkUploadLimit, incrementUploadCount } from '@/lib/uploadRateLimiter';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check upload limits before processing
    const limitStatus = await checkUploadLimit(user.id);
    if (!limitStatus.allowed) {
      return NextResponse.json({ 
        error: 'Upload limit exceeded',
        details: {
          limit: limitStatus.limit,
          remaining: limitStatus.remaining,
          resetAt: limitStatus.resetAt.toISOString(),
          isUnlimited: limitStatus.isUnlimited
        }
      }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only CSV files are supported.' 
      }, { status: 400 });
    }

    // Check file size
    if (file.size > FILE_SIZE_LIMITS.MAX) {
      return NextResponse.json({
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${FILE_SIZE_LIMITS.MAX / 1024 / 1024}MB`
      }, { status: 400 });
    }

    // Parse additional parameters
    const accountTagsStr = formData.get('accountTags') as string;
    const accountTags = accountTagsStr ? 
      accountTagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : 
      [];
    
    const brokerName = formData.get('brokerName') as string;


    // Read file content
    const fileContent = await file.text();

    // Initialize ingestion service
    const ingestionService = new CsvIngestionService();

    // For large files, should process in background (not implemented in this demo)
    if (file.size > FILE_SIZE_LIMITS.LARGE) {

      return NextResponse.json({
        message: 'Large file detected. Background processing is not yet implemented.',
        recommendation: 'Please use a smaller file (under 50MB) for immediate processing.'
      }, { status: 413 });
    }

    // Process the CSV
    const result = await ingestionService.ingestCsv(
      fileContent,
      file.name,
      user.id,
      accountTags,
      undefined, // userMappings
      brokerName || undefined // brokerName
    );



    // Increment upload count after successful processing
    // (Note: this will be called when the upload completes successfully, 
    // not just when it's validated)
    if (result.success && result.successCount > 0) {
      try {
        await incrementUploadCount(user.id);

      } catch (error) {
        console.error('Failed to increment upload count:', error);
        // Don't fail the whole operation for counting issues
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 });
  }
}

// Validate CSV endpoint
export async function PUT(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only CSV files are supported.' 
      }, { status: 400 });
    }

    const fileContent = await file.text();
    const ingestionService = new CsvIngestionService();
    
    // Just validate, don't process
    const validation = await ingestionService.validateCsvFile(fileContent);

    // Include detected format information in response
    const response = {
      ...validation,
      detectedFormatInfo: validation.detectedFormat ? {
        name: validation.detectedFormat.name,
        description: validation.detectedFormat.description,
        confidence: validation.formatConfidence,
        reasoning: validation.formatReasoning,
        brokerName: validation.detectedFormat.brokerName,
      } : validation.brokerDetection?.format ? {
        name: validation.brokerDetection.format.formatName,
        description: validation.brokerDetection.format.description || `${validation.brokerDetection.broker?.name} CSV format`,
        confidence: validation.brokerDetection.confidence,
        reasoning: validation.brokerDetection.isExactMatch ? 
          [`Exact format match found - headers match perfectly`] :
          [`Matched existing broker format with ${Math.round(validation.brokerDetection.confidence * 100)}% confidence`],
        brokerName: validation.brokerDetection.broker?.name,
      } : null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('CSV validation error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Validation failed'
    }, { status: 500 });
  }
}