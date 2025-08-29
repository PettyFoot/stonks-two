import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
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
      email: 'demo@tradevoyager.com',
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

export async function getDemoSessionFromCookies(): Promise<DemoSession | null> {
  try {
    console.log('=== getDemoSessionFromCookies ===');
    
    const cookieStore = await cookies();
    console.log('Available cookies:', cookieStore.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    const session = await getIronSession<{ demo?: DemoSession }>(
      cookieStore,
      sessionOptions
    );
    
    console.log('Iron session demo property:', !!session.demo);
    
    if (!session.demo) {
      console.log('No demo session in iron session');
      return null;
    }

    console.log('Demo session found in iron session:', {
      sessionId: session.demo.sessionId,
      expiresAt: session.demo.expiresAt,
      userId: session.demo.demoUser?.id
    });

    // Check if session is expired
    const expiresAt = new Date(session.demo.expiresAt);
    const now = new Date();
    console.log('Session expires at:', expiresAt);
    console.log('Current time:', now);
    console.log('Is expired:', expiresAt < now);
    
    if (expiresAt < now) {
      console.log('Demo session expired, clearing');
      await clearDemoSession();
      return null;
    }

    console.log('Returning valid demo session');
    return session.demo;
  } catch (error) {
    console.error('Error getting demo session:', error);
    return null;
  }
}

export async function saveDemoSession(demoSession: DemoSession) {
  const session = await getIronSession<{ demo?: DemoSession }>(
    await cookies(),
    sessionOptions
  );
  session.demo = demoSession;
  await session.save();
}

export async function clearDemoSession() {
  const session = await getIronSession<{ demo?: DemoSession }>(
    await cookies(),
    sessionOptions
  );
  session.demo = undefined;
  await session.save();
}

export async function extendDemoSession(): Promise<DemoSession | null> {
  const currentSession = await getDemoSessionFromCookies();
  if (!currentSession) {
    return null;
  }

  // Extend session by 30 minutes
  const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  currentSession.expiresAt = newExpiresAt.toISOString();
  
  await saveDemoSession(currentSession);
  return currentSession;
}

// Helper to check if a request has a demo session
export async function isDemoRequest(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('demo-session');
  
  if (!sessionCookie) {
    return false;
  }

  const demoSession = await getDemoSessionFromCookies();
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