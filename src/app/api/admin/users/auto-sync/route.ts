import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const AutoSyncUpdateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  autoSyncEnabled: z.boolean(),
});

// PUT - Update user's auto-sync setting
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, autoSyncEnabled } = AutoSyncUpdateSchema.parse(body);

    // Update user's auto-sync setting
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { autoSyncEnabled },
      select: {
        id: true,
        email: true,
        autoSyncEnabled: true
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating auto-sync setting:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update auto-sync setting' },
      { status: 500 }
    );
  }
}