import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();
    
    // In production, you might want to send this to an analytics service
    // For now, we'll just log it
    console.log('Web Vital:', metric);
    
    // You can send this to your preferred analytics service:
    // - Google Analytics 4
    // - Vercel Analytics (already integrated)
    // - Custom analytics endpoint
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vital:', error);
    return NextResponse.json({ error: 'Failed to process metric' }, { status: 500 });
  }
}