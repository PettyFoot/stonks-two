import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { listBrokerConnections, deleteBrokerConnection, updateSyncSettings } from '@/lib/snaptrade';
import { z } from 'zod';

// GET - List all broker connections for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const connections = await listBrokerConnections(session.user.sub);

    // Return connections without sensitive data
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      brokerName: conn.brokerName,
      accountId: conn.accountId,
      accountName: conn.accountName,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      lastSyncError: conn.lastSyncError,
      autoSyncEnabled: conn.autoSyncEnabled,
      syncInterval: conn.syncInterval,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      connections: sanitizedConnections,
      totalCount: connections.length,
    });

  } catch (error) {
    console.error('Error listing connections:', error);
    return NextResponse.json(
      { error: 'Failed to list broker connections' },
      { status: 500 }
    );
  }
}

const UpdateSettingsSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  autoSyncEnabled: z.boolean().optional(),
  syncInterval: z.number().int().min(3600).max(604800).optional(), // 1 hour to 1 week
});

// PUT - Update connection settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId, autoSyncEnabled, syncInterval } = UpdateSettingsSchema.parse(body);

    const updatedConnection = await updateSyncSettings(
      connectionId,
      session.user.sub,
      {
        ...(autoSyncEnabled !== undefined && { autoSyncEnabled }),
        ...(syncInterval !== undefined && { syncInterval }),
      }
    );

    return NextResponse.json({
      success: true,
      connection: {
        id: updatedConnection.id,
        brokerName: updatedConnection.brokerName,
        accountId: updatedConnection.accountId,
        accountName: updatedConnection.accountName,
        status: updatedConnection.status,
        lastSyncAt: updatedConnection.lastSyncAt,
        lastSyncError: updatedConnection.lastSyncError,
        autoSyncEnabled: updatedConnection.autoSyncEnabled,
        syncInterval: updatedConnection.syncInterval,
        createdAt: updatedConnection.createdAt,
        updatedAt: updatedConnection.updatedAt,
      },
    });

  } catch (error) {
    console.error('Error updating connection settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update connection settings' },
      { status: 500 }
    );
  }
}