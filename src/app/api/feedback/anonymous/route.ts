import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { emailService } from '@/lib/email/emailService';

// Simple in-memory rate limiting (resets on server restart)
// For production, consider using Redis or a database table
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_SUBMISSIONS = 1; // 1 submission per 24 hours per IP

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // No record or expired - allow and create new record
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  if (record.count >= MAX_SUBMISSIONS) {
    return { allowed: false, resetTime: record.resetTime };
  }

  // Increment count
  record.count += 1;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question1Rating,
      question2Rating,
      question3Rating,
      question4Rating,
      question5Rating,
      comment
    } = body;

    // Validate ratings
    const ratings = [question1Rating, question2Rating, question3Rating, question4Rating, question5Rating];
    for (const rating of ratings) {
      if (typeof rating !== 'number' || rating < 1 || rating > 10) {
        return NextResponse.json(
          { error: 'All ratings must be numbers between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      const hoursRemaining = Math.ceil((rateCheck.resetTime! - Date.now()) / (1000 * 60 * 60));
      return NextResponse.json(
        { error: `You've already submitted feedback recently. Please try again in ${hoursRemaining} hours.` },
        { status: 429 }
      );
    }

    // Try to get user info if they're logged in (optional)
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    try {
      const session = await getSession();
      if (session?.user) {
        // Look up user in database
        const user = await prisma.user.findUnique({
          where: { auth0Id: session.user.sub },
          select: {
            id: true,
            email: true,
            name: true,
          }
        });

        if (user) {
          userId = user.id;
          userEmail = user.email;
          userName = user.name;
        }
      }
    } catch (error) {
      // Ignore auth errors - feedback can be anonymous
      console.log('Could not get user session, proceeding with anonymous feedback');
    }

    // Create feedback response
    const feedbackResponse = await prisma.feedbackResponse.create({
      data: {
        userId: userId || null,
        userName: userName || 'Anonymous',
        userEmail: userEmail || 'anonymous@feedback.com',
        question1Rating,
        question2Rating,
        question3Rating,
        question4Rating,
        question5Rating,
        comment: comment || null,
        token: `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tokenUsed: true,
      },
    });

    // Send email notification to admin
    try {
      const avgRating = (question1Rating + question2Rating + question3Rating + question4Rating + question5Rating) / 5;
      const emailContent = `
New Feedback Submission

User: ${userName || 'Anonymous'}
Email: ${userEmail || 'Not provided'}
Average Rating: ${avgRating.toFixed(1)}/10

Ratings:
1. Navigation & Ease of Use: ${question1Rating}/10
2. Analytics & Insights: ${question2Rating}/10
3. Data Visualizations: ${question3Rating}/10
4. Performance & Speed: ${question4Rating}/10
5. Likelihood to Recommend: ${question5Rating}/10

${comment ? `Comments:\n${comment}` : 'No additional comments'}

--
Submitted via anonymous feedback form
Feedback ID: ${feedbackResponse.id}
      `.trim();

      await emailService.sendEmail({
        to: process.env.EMAIL_FROM!,
        subject: `New Feedback: ${avgRating.toFixed(1)}/10 - ${userName || 'Anonymous'}`,
        text: emailContent,
      });
    } catch (emailError) {
      console.error('Failed to send feedback notification email:', emailError);
      // Don't fail the request if email fails
    }

    console.log('Anonymous feedback response created:', {
      id: feedbackResponse.id,
      userName: userName || 'Anonymous',
      avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedbackResponse.id,
    });
  } catch (error) {
    console.error('Error submitting anonymous feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}