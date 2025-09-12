import { NextRequest, NextResponse } from 'next/server';
import { BrokerFormatService } from '@/lib/brokerFormatService';
import { getCurrentUser } from '@/lib/auth0';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const brokerService = new BrokerFormatService();
    
    if (query.trim()) {
      // Search for brokers by name or alias
      const brokers = await brokerService.searchBrokers(query);
      return NextResponse.json({ brokers });
    } else {
      // Return all brokers if no query
      const brokers = await brokerService.getAllBrokers();
      return NextResponse.json({ brokers });
    }

  } catch (error) {
    console.error('Broker search error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 });
  }
}

// Create a new broker
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, website, aliases } = body;

    if (!name) {
      return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
    }

    const brokerService = new BrokerFormatService();
    
    // Create the broker
    const broker = await brokerService.findOrCreateBroker(name.trim());
    
    // Add aliases if provided
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        if (alias && alias.trim()) {
          try {
            await brokerService.addBrokerAlias(broker.id, alias.trim());
          } catch (error) {
            // Continue if alias already exists
            console.warn(`Alias "${alias}" already exists, skipping`);
          }
        }
      }
    }

    // Return the broker with updated aliases
    const updatedBroker = await brokerService.findOrCreateBroker(name.trim());
    
    return NextResponse.json({ broker: updatedBroker });

  } catch (error) {
    console.error('Broker creation error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Broker creation failed'
    }, { status: 500 });
  }
}