import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { createHash } from 'crypto';

/**
 * Hash an IP address for privacy compliance (GDPR)
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string | null {
  // Check various headers for IP (common proxy headers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

/**
 * Normalize path to remove dynamic segments and query params
 * Examples:
 *   /blog/my-post-slug -> /blog
 *   /settings/cookies -> /settings
 *   /reports?tab=analytics -> /reports
 */
function normalizePath(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Skip API routes
  if (cleanPath.startsWith('/api/')) {
    return cleanPath;
  }

  // Get path segments
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  // For blog posts, return /blog
  if (segments[0] === 'blog' && segments.length > 1) {
    return '/blog';
  }

  // For share links, keep two levels
  if (segments[0] === 'share' && segments.length > 1) {
    return `/${segments[0]}/${segments[1]}`;
  }

  // For admin routes, keep two levels
  if (segments[0] === 'admin' && segments.length > 1) {
    return `/${segments[0]}/${segments[1]}`;
  }

  // For all other routes, keep only first segment
  return `/${segments[0]}`;
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Get authenticated user (can be null)
    let user = null;
    try {
      user = await getCurrentUser();
    } catch (error) {
      // Not authenticated - that's fine for analytics
      console.debug('Analytics tracking for non-authenticated user');
    }

    const body = await request.json();
    const {
      sessionId,
      action, // 'session_start' or 'page_view' or 'page_exit'

      // Session data (only on session_start)
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer,
      landingPage,
      userAgent,

      // Page view data
      path,
      previousPath,
      duration,
      exitedAt,
    } = body;

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // Get and hash IP address
    const clientIp = getClientIp(request);
    const ipHash = clientIp ? hashIp(clientIp) : null;

    // Handle session creation/update
    if (action === 'session_start') {
      // Check if session already exists
      const existingSession = await prisma.analyticsSession.findUnique({
        where: { sessionId },
      });

      if (existingSession) {
        // Update lastSeenAt for existing session
        await prisma.analyticsSession.update({
          where: { sessionId },
          data: {
            lastSeenAt: new Date(),
            // Update userId if user just logged in
            ...(user && !existingSession.userId ? { userId: user.id } : {}),
          },
        });

        return NextResponse.json({
          success: true,
          action: 'session_updated',
          sessionId,
        });
      } else {
        // Create new session
        await prisma.analyticsSession.create({
          data: {
            sessionId,
            userId: user?.id || null,
            utmSource: utmSource || null,
            utmMedium: utmMedium || null,
            utmCampaign: utmCampaign || null,
            utmTerm: utmTerm || null,
            utmContent: utmContent || null,
            referrer: referrer || null,
            landingPage: landingPage || '/',
            ipHash,
            userAgent: userAgent || null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          action: 'session_created',
          sessionId,
        });
      }
    }

    // Handle page view tracking
    if (action === 'page_view') {
      if (!path) {
        return NextResponse.json(
          { error: 'Missing required field: path' },
          { status: 400 }
        );
      }

      // Ensure session exists
      const session = await prisma.analyticsSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found. Must call session_start first.' },
          { status: 404 }
        );
      }

      // Update session lastSeenAt
      await prisma.analyticsSession.update({
        where: { sessionId },
        data: {
          lastSeenAt: new Date(),
          // Update userId if user just logged in
          ...(user && !session.userId ? { userId: user.id } : {}),
        },
      });

      // Normalize the path
      const normalizedPath = normalizePath(path);

      // Skip tracking API routes
      if (normalizedPath.startsWith('/api/')) {
        return NextResponse.json({ success: true, skipped: true });
      }

      // Check for existing unclosed page view for this session and path
      const existingView = await prisma.analyticsPageView.findFirst({
        where: {
          sessionId,
          normalizedPath,
          exitedAt: null,
        },
        orderBy: {
          enteredAt: 'desc',
        },
      });

      if (existingView && exitedAt) {
        // Update existing view with exit time and duration
        await prisma.analyticsPageView.update({
          where: { id: existingView.id },
          data: {
            exitedAt: new Date(exitedAt),
            duration,
          },
        });

        return NextResponse.json({
          success: true,
          action: 'page_view_updated',
          id: existingView.id,
        });
      } else if (!existingView) {
        // Create new page view entry
        const pageView = await prisma.analyticsPageView.create({
          data: {
            sessionId,
            userId: user?.id || null,
            path,
            normalizedPath,
            previousPath: previousPath || null,
            enteredAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          action: 'page_view_created',
          id: pageView.id,
        });
      }

      return NextResponse.json({ success: true, action: 'no-op' });
    }

    // Unknown action
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error tracking analytics:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    );
  }
}
