import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { updateSyncConfig } from '@/lib/snaptrade/sync';
import { z } from 'zod';

const UpdateConfigSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  limit: z.number().min(1).max(5000).optional(),
  activityTypes: z.string().optional(),
});

// GET - Get current sync configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get current config or create default
    let config = await prisma.snapTradeSyncConfig.findFirst();

    if (!config) {
      config = await prisma.snapTradeSyncConfig.create({
        data: {
          startDate: '2015-01-01',
          endDate: null,
          limit: 500,
          activityTypes: 'BUY,SELL'
        }
      });
    }

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Error fetching SnapTrade config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update sync configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdateConfigSchema.parse(body);

    // Update configuration
    const updatedConfig = await updateSyncConfig(validatedData);

    return NextResponse.json({
      success: true,
      config: updatedConfig
    });

  } catch (error) {
    console.error('Error updating SnapTrade config:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}