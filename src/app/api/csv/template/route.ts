import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const templatePath = join(process.cwd(), 'public', 'standard-csv-template.csv');
    const templateContent = readFileSync(templatePath, 'utf-8');

    return new NextResponse(templateContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="standard-csv-template.csv"',
      },
    });

  } catch (error) {
    console.error('Template download error:', error);
    
    return NextResponse.json({
      error: 'Failed to download template'
    }, { status: 500 });
  }
}