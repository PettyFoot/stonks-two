import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { getDemoSessionFromCookies } from './demo/demoSession';

export async function getCurrentUser() {
  try {
    // First check for demo session
    const demoSession = await getDemoSessionFromCookies();
    if (demoSession) {
      // Return demo user with consistent structure
      return {
        id: demoSession.demoUser.id,
        auth0Id: null,
        email: demoSession.demoUser.email,
        name: demoSession.demoUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Fall back to Auth0 session
    const session = await getSession();
  
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

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}