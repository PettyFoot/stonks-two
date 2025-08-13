import { NextRequest, NextResponse } from 'next/server';
import { CsvIngestionService, FILE_SIZE_LIMITS } from '@/lib/csvIngestion';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    // TODO: Remove this workaround when Auth0 releases Next.js 15 compatible version
    // Issue: Auth0's getSession() internally calls cookies().getAll() without await
    // This causes "cookies() should be awaited" error in Next.js 15
    const { prisma } = await import('@/lib/prisma');
    
    // Skip auth check for now and use test user
    let user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id: 'test-auth0-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
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
      accountTags
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
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
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    // TODO: Remove this workaround when Auth0 releases Next.js 15 compatible version
    const { prisma } = await import('@/lib/prisma');
    
    // Skip auth check for now and use test user
    let user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id: 'test-auth0-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
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
    const validation = await ingestionService.validateCsvFile(fileContent, file.name);

    // Include detected format information in response
    const response = {
      ...validation,
      detectedFormatInfo: validation.detectedFormat ? {
        name: validation.detectedFormat.name,
        description: validation.detectedFormat.description,
        confidence: validation.formatConfidence,
        reasoning: validation.formatReasoning,
        brokerName: validation.detectedFormat.brokerName,
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