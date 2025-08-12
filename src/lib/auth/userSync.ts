import { PrismaClient } from '@prisma/client';
import { Claims } from '@auth0/nextjs-auth0';

const prisma = new PrismaClient();

export async function syncUserToDatabase(user: Claims) {
  try {
    if (!user.sub || !user.email) {
      console.warn('Missing required user data for sync:', { sub: user.sub, email: user.email });
      return null;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { auth0Id: user.sub }
    });

    if (!existingUser) {
      // Create new user in database
      const newUser = await prisma.user.create({
        data: {
          auth0Id: user.sub,
          email: user.email,
          name: user.name || user.nickname || null,
        }
      });
      
      console.log('Created new user in database:', newUser.id);
      return newUser;
    } else {
      // Update existing user info if needed
      const updatedUser = await prisma.user.update({
        where: { auth0Id: user.sub },
        data: {
          name: user.name || user.nickname || existingUser.name,
          email: user.email,
          updatedAt: new Date(),
        }
      });
      
      console.log('Updated existing user in database:', existingUser.id);
      return updatedUser;
    }
  } catch (error) {
    console.error('Error syncing user to database:', error);
    return null;
  }
}