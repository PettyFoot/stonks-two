import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { syncUserToDatabase } from '@/lib/auth/userSync';

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const syncResult = await syncUserToDatabase(session.user);
    
    if (!syncResult.user) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: syncResult.user.id,
        email: syncResult.user.email,
        name: syncResult.user.name
      },
      wasReactivated: syncResult.wasReactivated
    });
  } catch (error) {
    console.error('Error in user sync API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}