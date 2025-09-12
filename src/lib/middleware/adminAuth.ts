import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';

export async function withAdminAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAdminAuth();
      return await handler(req, user);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        if (error.message === 'Admin access required') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export async function checkAdminAccess(): Promise<{ isAdmin: boolean; user?: any }> {
  try {
    const user = await requireAdminAuth();
    return { isAdmin: true, user };
  } catch (error) {
    return { isAdmin: false };
  }
}