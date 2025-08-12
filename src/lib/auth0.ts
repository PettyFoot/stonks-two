import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';

export async function getCurrentUser() {
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
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}