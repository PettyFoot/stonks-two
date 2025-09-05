import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { deleteBrokerConnection } from '@/lib/snaptrade';
import { z } from 'zod';

const DisconnectRequestSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId } = DisconnectRequestSchema.parse(body);

    await deleteBrokerConnection(connectionId, session.user.sub);

    return NextResponse.json({
      success: true,
      message: 'Broker connection disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting broker:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Connection not found') {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to disconnect broker' },
      { status: 500 }
    );
  }
}

// Alternative DELETE method
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    await deleteBrokerConnection(connectionId, session.user.sub);

    return NextResponse.json({
      success: true,
      message: 'Broker connection disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting broker:', error);
    
    if (error instanceof Error && error.message === 'Connection not found') {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to disconnect broker' },
      { status: 500 }
    );
  }
}