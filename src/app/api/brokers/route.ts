import { NextRequest, NextResponse } from 'next/server';
import { BrokerFormatService } from '@/lib/brokerFormatService';
import { getCurrentUser } from '@/lib/auth0';
import { z } from 'zod';

const CreateBrokerSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  aliases: z.array(z.string()).optional(),
});

const UpdateBrokerSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().optional(),
  aliases: z.array(z.string()).optional(),
});

// Get all brokers or search brokers
export async function GET(request: NextRequest) {
  try {
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {

      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');


    const brokerService = new BrokerFormatService();
    
    if (query.trim()) {
      const brokers = await brokerService.searchBrokers(query);

      return NextResponse.json({ brokers });
    } else {
      const brokers = await brokerService.getAllBrokers();
      const limitedBrokers = brokers.slice(0, limit);

      return NextResponse.json({ brokers: limitedBrokers });
    }

  } catch (error) {
    console.error('💥 Broker GET error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch brokers'
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
    
    const { name, website, aliases } = CreateBrokerSchema.parse(body);
    
    if (aliases && aliases.length > 0) {
    }

    const brokerService = new BrokerFormatService();
    
    // Find or create the broker (this already checks for aliases)
    const broker = await brokerService.findOrCreateBroker(name.trim());
    
    // If broker was found by an existing name/alias, add the entered name as a new alias if it's different
    const trimmedName = name.trim();
    const isNewAlias = broker.name !== trimmedName && 
                      !broker.aliases.some(alias => alias.alias === trimmedName);
    
    if (isNewAlias) {
      try {
        await brokerService.addBrokerAlias(broker.id, trimmedName);

      } catch (aliasError) {
        console.warn(`⚠️ Alias "${trimmedName}" already exists or couldn't be added:`, aliasError);
      }
    }
    
    // Add website if provided
    if (website) {
      const { prisma } = await import('@/lib/prisma');
      await prisma.broker.update({
        where: { id: broker.id },
        data: { website }
      });
    }
    
    // Add aliases if provided
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        if (alias && alias.trim()) {
          try {
            await brokerService.addBrokerAlias(broker.id, alias.trim());

          } catch (error) {
            console.warn(`⚠️ Alias "${alias}" already exists, skipping`);
          }
        }
      }
    }

    // Return the broker with updated relations
    const updatedBroker = await brokerService.findOrCreateBroker(name.trim());
    
    
    return NextResponse.json({ broker: updatedBroker });

  } catch (error) {
    console.error('💥 Broker POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Broker creation failed'
    }, { status: 500 });
  }
}

// Update an existing broker (for future use)
export async function PATCH(request: NextRequest) {
  try {

    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {

      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { brokerId, ...updateData } = body;
    
    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }


    const validatedData = UpdateBrokerSchema.parse(updateData);
    
    const { prisma } = await import('@/lib/prisma');
    
    // Extract aliases for separate handling
    const { aliases, ...brokerData } = validatedData;
    
    // Update the broker (excluding aliases)
    let updatedBroker = await prisma.broker.update({
      where: { id: brokerId },
      data: brokerData,
      include: {
        aliases: true,
        csvFormats: {
          orderBy: { usageCount: 'desc' }
        }
      }
    });

    // Handle aliases update if provided
    if (aliases && Array.isArray(aliases)) {
      // Delete existing aliases and create new ones
      await prisma.brokerAlias.deleteMany({
        where: { brokerId }
      });

      if (aliases.length > 0) {
        await prisma.brokerAlias.createMany({
          data: aliases.map(alias => ({
            brokerId,
            alias
          }))
        });

        // Fetch updated broker with new aliases
        updatedBroker = await prisma.broker.findUnique({
          where: { id: brokerId },
          include: {
            aliases: true,
            csvFormats: {
              orderBy: { usageCount: 'desc' }
            }
          }
        }) || updatedBroker;
      }
    }


    
    return NextResponse.json({ broker: updatedBroker });

  } catch (error) {
    console.error('💥 Broker PATCH error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Broker update failed'
    }, { status: 500 });
  }
}