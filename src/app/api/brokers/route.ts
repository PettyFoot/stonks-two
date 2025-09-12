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
    console.log('🔍 GET /api/brokers - Fetching brokers');
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Unauthorized access attempt to brokers API');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`👤 User ${user.id} requesting brokers, query: "${query}", limit: ${limit}`);

    const brokerService = new BrokerFormatService();
    
    if (query.trim()) {
      console.log(`🔎 Searching brokers with query: "${query}"`);
      const brokers = await brokerService.searchBrokers(query);
      console.log(`✅ Found ${brokers.length} brokers matching query`);
      return NextResponse.json({ brokers });
    } else {
      console.log('📋 Fetching all brokers');
      const brokers = await brokerService.getAllBrokers();
      const limitedBrokers = brokers.slice(0, limit);
      console.log(`✅ Returning ${limitedBrokers.length} brokers (total: ${brokers.length})`);
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
    console.log('➕ POST /api/brokers - Creating new broker');
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Unauthorized access attempt to create broker');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📥 Request body:', body);
    
    const { name, website, aliases } = CreateBrokerSchema.parse(body);
    
    console.log(`👤 User ${user.id} creating broker: "${name}"`);
    if (aliases && aliases.length > 0) {
      console.log('🔗 With aliases:', aliases);
    }

    const brokerService = new BrokerFormatService();
    
    // Find or create the broker (this already checks for aliases)
    console.log(`🏗️ Finding or creating broker: ${name}`);
    const broker = await brokerService.findOrCreateBroker(name.trim());
    
    // If broker was found by an existing name/alias, add the entered name as a new alias if it's different
    const trimmedName = name.trim();
    const isNewAlias = broker.name !== trimmedName && 
                      !broker.aliases.some(alias => alias.alias === trimmedName);
    
    if (isNewAlias) {
      console.log(`🔗 Adding "${trimmedName}" as new alias for existing broker: ${broker.name}`);
      try {
        await brokerService.addBrokerAlias(broker.id, trimmedName);
        console.log(`✅ Added new alias: "${trimmedName}"`);
      } catch (aliasError) {
        console.warn(`⚠️ Alias "${trimmedName}" already exists or couldn't be added:`, aliasError);
      }
    }
    
    // Add website if provided
    if (website) {
      console.log(`🌐 Updating website: ${website}`);
      const { prisma } = await import('@/lib/prisma');
      await prisma.broker.update({
        where: { id: broker.id },
        data: { website }
      });
    }
    
    // Add aliases if provided
    if (aliases && Array.isArray(aliases)) {
      console.log(`🔗 Adding ${aliases.length} aliases...`);
      for (const alias of aliases) {
        if (alias && alias.trim()) {
          try {
            await brokerService.addBrokerAlias(broker.id, alias.trim());
            console.log(`✅ Added alias: "${alias}"`);
          } catch (error) {
            console.warn(`⚠️ Alias "${alias}" already exists, skipping`);
          }
        }
      }
    }

    // Return the broker with updated relations
    const updatedBroker = await brokerService.findOrCreateBroker(name.trim());
    
    console.log(`🎉 Successfully created/updated broker: ${updatedBroker.id}`);
    console.log(`📊 Broker has ${updatedBroker.aliases.length} aliases and ${updatedBroker.csvFormats.length} formats`);
    
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
    console.log('✏️ PATCH /api/brokers - Updating broker');
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Unauthorized access attempt to update broker');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { brokerId, ...updateData } = body;
    
    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }

    console.log(`👤 User ${user.id} updating broker: ${brokerId}`);
    console.log('📝 Update data:', updateData);

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

    console.log(`✅ Successfully updated broker: ${brokerId}`);
    
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