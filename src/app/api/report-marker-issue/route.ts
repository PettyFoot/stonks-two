import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { getCurrentUser } from '@/lib/auth0';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      symbol,
      chartDate,
      timeInterval,
      executionsCount,
      userAgent,
      timestamp
    } = body;

    // Validate required fields
    if (!symbol || !chartDate) {
      return NextResponse.json(
        { error: 'Symbol and chart date are required' },
        { status: 400 }
      );
    }

    // Check environment variables for email
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_APP_PASSWORD) {
      console.error('Missing email configuration for marker issue report');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // Test transporter configuration
    await transporter.verify();

    // Email content
    const emailContent = `
EXECUTION MARKER ISSUE REPORT

User ID: ${user.id}
User Email: ${user.email || 'Not available'}
Timestamp: ${new Date(timestamp || Date.now()).toISOString()}

Chart Details:
- Symbol: ${symbol}
- Chart Date: ${chartDate}
- Time Interval: ${timeInterval || 'Not specified'}
- Executions Count: ${executionsCount || 'Not specified'}

Browser Information:
- User Agent: ${userAgent || 'Not available'}

Description:
User reported that execution markers are not aligned correctly with the candlestick chart.
This may indicate timezone conversion issues or data synchronization problems.

This report was generated automatically from the Trade Voyager Analytics platform.
    `.trim();

    // Send email to support
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: 'tradevoyageranalyticssup@gmail.com',
      subject: 'EXEC MARKERS OFF INDICATED',
      text: emailContent,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('Marker issue report sent successfully:', {
      userId: user.id,
      symbol,
      chartDate,
      messageId: result.messageId
    });

    return NextResponse.json(
      { success: true, message: 'Issue reported successfully. Our support team has been notified.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Marker issue report error:', error);

    let errorMessage = 'Failed to report issue. Please try again later.';

    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Email authentication failed. Please contact support directly.';
      } else if (error.message.includes('getaddrinfo')) {
        errorMessage = 'Network connection failed. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}