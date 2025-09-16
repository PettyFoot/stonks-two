import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { accountDeletionService } from '@/lib/services/accountDeletion';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Auth0 sends different event types, we only care about post-login
    if (body.event?.type !== 'post-login') {
      return NextResponse.json({ success: true });
    }

    const { user } = body;
    
    if (!user?.user_id || !user?.email) {
      console.error('Missing required user data from Auth0');
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { auth0Id: user.user_id }
    });

    if (!existingUser) {
      // Create new user in database
      const newUser = await prisma.user.create({
        data: {
          auth0Id: user.user_id,
          email: user.email,
          name: user.name || user.nickname || null,
        }
      });
      

    } else {
      // Update existing user info if needed
      await prisma.user.update({
        where: { auth0Id: user.user_id },
        data: {
          name: user.name || user.nickname || existingUser.name,
          email: user.email,
        }
      });
      


      // Check if account was marked for deletion and reactivate if possible
      try {
        const wasReactivated = await accountDeletionService.reactivateOnLogin(
          existingUser.id,
          user.email
        );
        
        if (wasReactivated) {

        }
      } catch (reactivationError) {
        console.error('Failed to reactivate account on login:', reactivationError);
        // Don't fail the login process for reactivation errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Auth0 hook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}