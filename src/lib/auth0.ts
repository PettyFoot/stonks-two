import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export async function getCurrentUser(req?: NextRequest) {
  try {
    const session = await getSession(req);
  
    if (!session?.user?.sub) {
      return null;
    }

    // Find or create user in our database
    let user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id: session.user.sub,
          email: session.user.email || '',
          name: session.user.name || session.user.nickname || '',
        }
      });
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function requireAuth(req?: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}