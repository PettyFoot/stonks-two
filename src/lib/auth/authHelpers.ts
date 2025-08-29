import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getDemoUserId } from '../demo/demoSession';

interface DemoUserInfo {
  id: string;
  email: string;
  name: string;
  isDemo: true;
}

interface AuthUserInfo {
  id: string;
  email: string;
  name: string;
  auth0Id: string;
  isDemo: false;
}

export type UserInfo = DemoUserInfo | AuthUserInfo;

export async function getCurrentUserWithDemo(request: NextRequest): Promise<UserInfo | null> {
  // Check for demo user in headers (set by middleware)
  const isDemoUser = request.headers.get('x-demo-user') === 'true';
  const demoUserId = request.headers.get('x-demo-user-id');

  if (isDemoUser && demoUserId) {
    return {
      id: demoUserId,
      email: 'demo@tradevoyager.com',
      name: 'Demo Trader',
      isDemo: true,
    };
  }

  // Fall back to Auth0 session
  try {
    const session = await getSession();
    if (session?.user) {
      return {
        id: session.user.sub || '',
        email: session.user.email || '',
        name: session.user.name || '',
        auth0Id: session.user.sub || '',
        isDemo: false,
      };
    }
  } catch (error) {
    console.error('Error getting Auth0 session:', error);
  }

  return null;
}

export async function requireAuth(request: NextRequest): Promise<UserInfo> {
  const user = await getCurrentUserWithDemo(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

export function isDemoUser(userId: string): boolean {
  return userId === getDemoUserId();
}

export function canPerformWriteOperation(user: UserInfo): boolean {
  return !user.isDemo;
}