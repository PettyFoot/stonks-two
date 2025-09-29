import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

/**
 * Normalize path to main route level
 * Examples:
 *   /settings/cookies -> /settings
 *   /admin/users/123 -> /admin/users
 *   /reports?tab=analytics -> /reports
 */
function normalizePath(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Skip API routes
  if (cleanPath.startsWith('/api/')) {
    return '';
  }

  // Get path segments
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  // For admin routes, keep two levels (e.g., /admin/users)
  if (segments[0] === 'admin' && segments.length > 1) {
    return `/${segments[0]}/${segments[1]}`;
  }

  // For all other routes, keep only first segment
  return `/${segments[0]}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Only track authenticated users
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { path, duration, sessionId, exitedAt } = body;

    if (!path || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: path, sessionId' },
        { status: 400 }
      );
    }

    // Normalize the path to main route level
    const normalizedPath = normalizePath(path);

    // Skip tracking if path is invalid (e.g., API routes)
    if (!normalizedPath) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Check if there's an existing page view for this session and path that hasn't been closed
    const existingView = await prisma.pageView.findFirst({
      where: {
        userId: user.id,
        sessionId,
        path: normalizedPath,
        exitedAt: null,
      },
      orderBy: {
        enteredAt: 'desc',
      },
    });

    if (existingView && exitedAt) {
      // Update existing view with exit time and duration
      await prisma.pageView.update({
        where: { id: existingView.id },
        data: {
          exitedAt: new Date(exitedAt),
          duration,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'updated',
        id: existingView.id
      });
    } else if (!existingView) {
      // Create new page view entry
      const pageView = await prisma.pageView.create({
        data: {
          userId: user.id,
          path: normalizedPath,
          sessionId,
          enteredAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        action: 'created',
        id: pageView.id
      });
    }

    return NextResponse.json({ success: true, action: 'no-op' });
  } catch (error) {
    console.error('Error tracking page view:', error);
    return NextResponse.json(
      { error: 'Failed to track page view' },
      { status: 500 }
    );
  }
}