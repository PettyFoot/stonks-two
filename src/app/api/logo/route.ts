import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'trade-voyager-logo.png');
    
    const logoBuffer = await fs.readFile(logoPath);
    
    const resizedLogo = await sharp(logoBuffer)
      .resize(150, 150, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    return new NextResponse(resizedLogo, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error serving logo:', error);
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }
}