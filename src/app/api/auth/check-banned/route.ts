import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/check-banned
 *
 * Check if a user is banned from registering
 * Called by Auth0 Pre-Registration Action
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API secret
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.AUTH0_BAN_CHECK_SECRET;

    if (!expectedSecret) {
      console.error('[BAN_CHECK] AUTH0_BAN_CHECK_SECRET not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('[BAN_CHECK] Unauthorized ban check attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, googleEmail, githubUsername } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user is banned by any identifier
    const bannedUser = await prisma.bannedUser.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(googleEmail ? [{ googleEmail: googleEmail }] : []),
          ...(githubUsername ? [{ githubUsername: githubUsername }] : [])
        ]
      },
      select: {
        id: true,
        email: true,
        bannedAt: true,
        reason: true,
        bannedVia: true
      }
    });

    if (bannedUser) {
      console.log(`[BAN_CHECK] Found banned user attempting registration:`, {
        email,
        googleEmail,
        githubUsername,
        bannedEmail: bannedUser.email,
        bannedAt: bannedUser.bannedAt
      });

      return NextResponse.json({
        isBanned: true,
        reason: 'Account not eligible for registration',
        bannedAt: bannedUser.bannedAt
      });
    }

    // User is not banned
    return NextResponse.json({
      isBanned: false
    });

  } catch (error) {
    console.error('[BAN_CHECK] Error checking ban status:', error);

    // Return not banned on error (fail open) to avoid blocking legitimate users
    return NextResponse.json({
      isBanned: false,
      error: 'Error checking ban status'
    }, { status: 200 }); // Still return 200 with isBanned: false
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}