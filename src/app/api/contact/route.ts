import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  console.log('Contact API called');
  
  try {
    const body = await request.json();
    const { name, email, subject, message, category, recaptchaToken } = body;

    console.log('Form data received:', { name, email, subject, category, hasRecaptcha: !!recaptchaToken });

    // Validate required fields - only message is required
    if (!message) {
      console.log('Missing required message field');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Email validation (only if email is provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('Invalid email format');
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
    }

    // Verify reCAPTCHA (only if configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        console.log('Missing reCAPTCHA token');
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
        console.log('reCAPTCHA verification failed:', recaptchaResult);
        return NextResponse.json(
          { error: 'reCAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }

      console.log('reCAPTCHA verified successfully');
    } else {
      console.log('reCAPTCHA not configured, skipping verification');
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

    console.log('Creating email transporter...');

    // Create transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // Test transporter configuration
    console.log('Testing transporter connection...');
    await transporter.verify();
    console.log('Transporter verified successfully');

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

    console.log('Sending email...');

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

    console.log('Email sent successfully:', result.messageId);

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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}