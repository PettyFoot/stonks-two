import { PrismaClient } from '@prisma/client';
import { Claims } from '@auth0/nextjs-auth0';
import { accountDeletionService } from '@/lib/services/accountDeletion';

const prisma = new PrismaClient();

export async function syncUserToDatabase(user: Claims) {
  try {
    if (!user.sub || !user.email) {
      console.warn('Missing required user data for sync:', { sub: user.sub, email: user.email });
      return { user: null, wasReactivated: false };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { auth0Id: user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        auth0Id: true,
        deletionRequestedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true
      }
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
      

      return { user: newUser, wasReactivated: false };
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
      


      // Check if account was marked for deletion and reactivate if possible
      let wasReactivated = false;
      if (existingUser.deletionRequestedAt || existingUser.deletedAt) {
        try {
          wasReactivated = await accountDeletionService.reactivateOnLogin(
            existingUser.id,
            user.email || existingUser.email
          );
          
          if (wasReactivated) {

          }
        } catch (reactivationError) {
          console.error('Failed to reactivate account during sync:', reactivationError);
          // Don't fail the sync process for reactivation errors
        }
      }

      return { user: updatedUser, wasReactivated };
    }
  } catch (error) {
    console.error('Error syncing user to database:', error);
    return { user: null, wasReactivated: false };
  }
}