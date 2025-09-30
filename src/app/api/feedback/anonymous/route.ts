import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { emailService } from '@/lib/email/emailService';
import crypto from 'crypto';

const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_COMMENT_LENGTH = 5000; // 5000 characters
const MAX_REQUEST_SIZE = 50000; // 50KB

/**
 * Generate cryptographically secure token
 */
function generateSecureToken(): string {
  const buffer = crypto.randomBytes(32);
  return `anon-${buffer.toString('base64url')}`;
}

/**
 * Get client IP address from request headers (Vercel-safe)
 */
function getClientIp(req: NextRequest): string {
  // Vercel-specific header (most reliable)
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  // Cloudflare
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Standard headers (use rightmost IP before our server)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[ips.length - 1] || 'unknown';
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Hash IP address for privacy and rate limiting
 */
function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || process.env.NEXTAUTH_SECRET || 'change-me-in-production';
  return crypto.createHmac('sha256', secret)
    .update(ip)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars
}

/**
 * Sanitize comment to prevent XSS and other attacks
 */
function sanitizeComment(comment: string | null | undefined): string | null {
  if (!comment) return null;

  // Remove null bytes (could break PostgreSQL)
  let sanitized = comment.replace(/\0/g, '');

  // Normalize Unicode (prevent homograph attacks)
  sanitized = sanitized.normalize('NFKC');

  // Remove invisible characters except normal whitespace
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove excessive consecutive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ');

  // Basic HTML escaping
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized || null;
}

export async function POST(req: NextRequest) {
  try {
    // Check content-length header
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    // Read body with size limit
    const text = await req.text();
    if (text.length > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

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

    // Validate comment type and length
    if (comment !== null && comment !== undefined) {
      if (typeof comment !== 'string') {
        return NextResponse.json(
          { error: 'Comment must be a string' },
          { status: 400 }
        );
      }

      if (comment.length > MAX_COMMENT_LENGTH) {
        return NextResponse.json(
          { error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters` },
          { status: 400 }
        );
      }
    }

    // Get and hash IP address for rate limiting
    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);

    // Database-backed rate limiting (survives restarts and deployments)
    const existingSubmission = await prisma.feedbackResponse.findFirst({
      where: {
        ipAddressHash: ipHash,
        submittedAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW),
        },
      },
      select: { id: true, submittedAt: true },
    });

    if (existingSubmission) {
      const timeRemaining = RATE_LIMIT_WINDOW - (Date.now() - existingSubmission.submittedAt.getTime());
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
      return NextResponse.json(
        { error: `You've already submitted feedback recently. Please try again in ${hoursRemaining} hour(s).` },
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

    // Sanitize comment
    const sanitizedComment = sanitizeComment(comment);

    // Create feedback response with secure token and IP hash
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
        comment: sanitizedComment,
        token: generateSecureToken(),
        tokenUsed: true,
        ipAddressHash: ipHash,
      },
    });

    // Email batching: Send at most 1 notification per hour
    // Check when the last notification was sent
    const NOTIFICATION_BATCH_WINDOW = 60 * 60 * 1000; // 1 hour

    try {
      // Get the most recent feedback notification timestamp
      const recentFeedbacks = await prisma.feedbackResponse.findMany({
        where: {
          submittedAt: {
            gte: new Date(Date.now() - NOTIFICATION_BATCH_WINDOW),
          },
        },
        orderBy: { submittedAt: 'asc' },
        select: { id: true, submittedAt: true },
        take: 1,
      });

      // Only send email if this is the first feedback in the last hour
      // This prevents email spam while still notifying about new feedback
      if (recentFeedbacks.length === 0 || recentFeedbacks[0].id === feedbackResponse.id) {
        const avgRating = (question1Rating + question2Rating + question3Rating + question4Rating + question5Rating) / 5;

        // Count total feedbacks in the last hour (including this one)
        const feedbackCount = await prisma.feedbackResponse.count({
          where: {
            submittedAt: {
              gte: new Date(Date.now() - NOTIFICATION_BATCH_WINDOW),
            },
          },
        });

        const emailContent = `
New Feedback Submission${feedbackCount > 1 ? ` (${feedbackCount} in last hour)` : ''}

User: ${userName || 'Anonymous'}
Email: ${userEmail || 'Not provided'}
Average Rating: ${avgRating.toFixed(1)}/10

Ratings:
1. Navigation & Ease of Use: ${question1Rating}/10
2. Analytics & Insights: ${question2Rating}/10
3. Data Visualizations: ${question3Rating}/10
4. Performance & Speed: ${question4Rating}/10
5. Likelihood to Recommend: ${question5Rating}/10

${sanitizedComment ? `Comments:\n${sanitizedComment}` : 'No additional comments'}

${feedbackCount > 1 ? `\nNote: ${feedbackCount} feedback submission(s) received in the last hour. View all in admin panel.` : ''}

--
Submitted via anonymous feedback form
Feedback ID: ${feedbackResponse.id}
        `.trim();

        await emailService.sendEmail({
          to: process.env.EMAIL_FROM!,
          subject: `New Feedback: ${avgRating.toFixed(1)}/10${feedbackCount > 1 ? ` (${feedbackCount} total)` : ''} - ${userName || 'Anonymous'}`,
          text: emailContent,
        });
      }
    } catch (emailError) {
      // Log error but don't expose details
      console.error('Failed to send feedback notification email:', {
        timestamp: new Date().toISOString(),
        feedbackId: feedbackResponse.id,
        errorType: emailError instanceof Error ? emailError.name : 'Unknown',
      });
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
    // Log error internally without sensitive details
    console.error('Feedback submission error:', {
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.name : 'Unknown',
      // Don't log full error object in production
      ...(process.env.NODE_ENV === 'development' && { error }),
    });

    // Return generic error to client
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}