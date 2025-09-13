import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export interface DemoSession {
  isDemo: true;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  demoUser: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  features: {
    canUpload: false;
    canEdit: false;
    canDelete: false;
    canExport: false;
  };
}

const sessionOptions: SessionOptions = {
  password: process.env.DEMO_SESSION_SECRET || 'complex_password_at_least_32_characters_long_demo_key',
  cookieName: 'demo-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 30, // 30 minutes
    path: '/', // Ensure cookie is available site-wide
  },
};

export async function createDemoSession(): Promise<DemoSession> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

  const demoSession: DemoSession = {
    isDemo: true,
    sessionId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    demoUser: {
      id: 'demo-user-001',
      name: 'Demo Trader',
      email: 'demo@tradevoyageranalytics.com',
      picture: '/demo-avatar.png',
    },
    features: {
      canUpload: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
    },
  };

  return demoSession;
}

export async function getDemoSessionFromCookies(cookieStore?: any): Promise<DemoSession | null> {
  try {
    // If no cookieStore provided, this function must be called from a server context
    if (!cookieStore) {
      const { cookies } = await import('next/headers');
      cookieStore = await cookies();
    }
    
    const session = await getIronSession<{ demo?: DemoSession }>(
      cookieStore,
      sessionOptions
    );
    
    if (!session.demo) {
      return null;
    }

    // Check if session is expired
    const expiresAt = new Date(session.demo.expiresAt);
    const now = new Date();
    
    if (expiresAt < now) {
      await clearDemoSession(cookieStore);
      return null;
    }
    return session.demo;
  } catch (error) {
    console.error('Error getting demo session:', error);
    return null;
  }
}

export async function saveDemoSession(demoSession: DemoSession, cookieStore?: any) {
  if (!cookieStore) {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
  }
  
  const session = await getIronSession<{ demo?: DemoSession }>(
    cookieStore,
    sessionOptions
  );
  session.demo = demoSession;
  await session.save();
}

export async function clearDemoSession(cookieStore?: any) {
  if (!cookieStore) {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
  }
  
  const session = await getIronSession<{ demo?: DemoSession }>(
    cookieStore,
    sessionOptions
  );
  session.demo = undefined;
  await session.save();
}

export async function extendDemoSession(cookieStore?: any): Promise<DemoSession | null> {
  if (!cookieStore) {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
  }
  
  const currentSession = await getDemoSessionFromCookies(cookieStore);
  if (!currentSession) {
    return null;
  }

  // Extend session by 30 minutes
  const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  currentSession.expiresAt = newExpiresAt.toISOString();
  
  await saveDemoSession(currentSession, cookieStore);
  return currentSession;
}

// Helper to check if a request has a demo session
export async function isDemoRequest(request: NextRequest): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('demo-session');
  
  if (!sessionCookie) {
    return false;
  }

  const demoSession = await getDemoSessionFromCookies(cookieStore);
  return demoSession !== null;
}

// Helper to get demo user ID
export function getDemoUserId(): string {
  return 'demo-user-001';
}

// Check if user is demo based on user ID
export function isDemoUser(userId: string): boolean {
  return userId === 'demo-user-001';
}