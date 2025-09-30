import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, category, recaptchaToken } = body;



    // Validate required fields - only message is required
    if (!message) {

      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Email validation (only if email is provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {

        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
    }

    // Verify reCAPTCHA (only if configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {

        return NextResponse.json(
          { error: 'reCAPTCHA verification is required' },
          { status: 400 }
        );
      }

      // Verify reCAPTCHA with Google
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      });

      const recaptchaResult = await recaptchaResponse.json();
      
      if (!recaptchaResult.success) {

        return NextResponse.json(
          { error: 'reCAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }


    } else {

    }

    // Check environment variables
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_APP_PASSWORD) {
      console.error('Missing email configuration:', {
        EMAIL_FROM: !!process.env.EMAIL_FROM,
        EMAIL_APP_PASSWORD: !!process.env.EMAIL_APP_PASSWORD
      });
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
Contact Form Submission

Name: ${name || 'Not provided'}
Email: ${email || 'Not provided'}
Category: ${category || 'General'}
Subject: ${subject || 'No subject'}

Message:
${message}

--
Sent from Trade Voyager Analytics Contact Form
    `.trim();



    // Send email
    const mailOptions: any = {
      from: process.env.EMAIL_FROM,
      to: 'tradevoyageranalyticssup@gmail.com',
      subject: `Contact Form: ${subject || 'No subject'}`,
      text: emailContent,
    };

    // Only add replyTo if email is provided
    if (email) {
      mailOptions.replyTo = email;
    }

    const result = await transporter.sendMail(mailOptions);

    // Save submission to database
    try {
      await prisma.contactSubmission.create({
        data: {
          name: name || null,
          email: email || null,
          message: `Category: ${category || 'General'}\nSubject: ${subject || 'No subject'}\n\n${message}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });
    } catch (dbError) {
      // Log database error but don't fail the request since email was sent
      console.error('Failed to save contact submission to database:', dbError);
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error details:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send message. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Email authentication failed. Please check email configuration.';
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