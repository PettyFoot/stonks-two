import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { syncUserToDatabase } from '@/lib/auth/userSync';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const syncedUser = await syncUserToDatabase(session.user);
    
    if (!syncedUser) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: syncedUser.id,
        email: syncedUser.email,
        name: syncedUser.name
      }
    });
  } catch (error) {
    console.error('Error in user sync API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}