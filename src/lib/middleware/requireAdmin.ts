import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';

/**
 * Middleware to require admin authentication
 */
export async function requireAdmin(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return user;
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Higher-order function to wrap API handlers with admin authentication
 */
export function withAdmin(
  handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const authResult = await requireAdmin(request);

    // If authResult is a NextResponse (error), return it
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Otherwise, it's the user object, proceed with handler
    return handler(request, authResult, ...args);
  };
}