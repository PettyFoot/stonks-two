import { prisma } from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { getDemoSessionFromCookies } from './demo/demoSession';
import { accountDeletionService } from './services/accountDeletion';

export async function getCurrentUser() {
  try {
    // First check for Auth0 session (prioritize real users)
    const session = await getSession();
    
    if (session?.user?.sub) {
      // User is authenticated with Auth0, return their data
      // Find or create user in our database
      let user = await prisma.user.findUnique({
        where: { auth0Id: session.user.sub },
        select: {
          id: true,
          auth0Id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          deletionRequestedAt: true,
          deletedAt: true
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            auth0Id: session.user.sub,
            email: session.user.email || '',
            name: session.user.name || session.user.nickname || '',
          },
          select: {
            id: true,
            auth0Id: true,
            email: true,
            name: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
            deletionRequestedAt: true,
            deletedAt: true
          }
        });
      } else {
        // Check if account was marked for deletion and reactivate if possible
        if (user.deletionRequestedAt || user.deletedAt) {
          try {
            const wasReactivated = await accountDeletionService.reactivateOnLogin(
              user.id,
              user.email
            );
            
            if (wasReactivated) {
              console.log('Account automatically reactivated for user:', user.id);
              // Refresh user data after reactivation
              user = await prisma.user.findUnique({
                where: { id: user.id },
                select: {
                  id: true,
                  auth0Id: true,
                  email: true,
                  name: true,
                  isAdmin: true,
                  createdAt: true,
                  updatedAt: true,
                  deletionRequestedAt: true,
                  deletedAt: true
                }
              });
            }
          } catch (reactivationError) {
            console.error('Failed to reactivate account in getCurrentUser:', reactivationError);
            // Continue with the user object as-is, don't block authentication
          }
        }
      }

      // Return user without deletion fields for regular auth flow
      if (!user) {
        throw new Error('User not found after reactivation attempt');
      }
      
      return {
        id: user.id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }

    // Only fall back to demo session if no Auth0 user
    const demoSession = await getDemoSessionFromCookies();
    if (demoSession) {
      // Return demo user with consistent structure
      return {
        id: demoSession.demoUser.id,
        auth0Id: null,
        email: demoSession.demoUser.email,
        name: demoSession.demoUser.name,
        isAdmin: false, // Demo users are never admins
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  
    // No auth0 session and no demo session - return null
    return null;
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

export async function requireAdminAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!user.isAdmin) {
    throw new Error('Admin access required');
  }
  return user;
}