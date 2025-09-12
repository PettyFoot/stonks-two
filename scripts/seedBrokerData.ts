import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample broker data with their common aliases
const BROKER_DATA = [
  {
    name: 'Interactive Brokers',
    website: 'https://www.interactivebrokers.com',
    aliases: ['IBKR', 'IB', 'Interactive']
  },
  {
    name: 'Charles Schwab',
    website: 'https://www.schwab.com',
    aliases: ['Schwab', 'Charles Schwab Corporation', 'SCHW']
  },
  {
    name: 'TD Ameritrade',
    website: 'https://www.tdameritrade.com',
    aliases: ['TDA', 'TD', 'Ameritrade', 'ThinkorSwim', 'TOS', 'Think or Swim']
  },
  {
    name: 'E*TRADE',
    website: 'https://us.etrade.com',
    aliases: ['ETRADE', 'E-Trade', 'ETrade', 'Morgan Stanley E*TRADE']
  },
  {
    name: 'Fidelity',
    website: 'https://www.fidelity.com',
    aliases: ['Fidelity Investments', 'FID', 'Fidelity Brokerage']
  },
  {
    name: 'Robinhood',
    website: 'https://robinhood.com',
    aliases: ['RH', 'Robin Hood', 'HOOD']
  },
  {
    name: 'TradeStation',
    website: 'https://www.tradestation.com',
    aliases: ['TS', 'Trade Station', 'TRAD']
  },
  {
    name: 'Webull',
    website: 'https://www.webull.com',
    aliases: ['WB', 'Web Bull']
  },
  {
    name: 'Tastyworks',
    website: 'https://tastyworks.com',
    aliases: ['Tasty Works', 'Tasty', 'TW']
  },
  {
    name: 'Merrill Edge',
    website: 'https://www.merrilledge.com',
    aliases: ['Merrill', 'Bank of America Merrill', 'BAC']
  }
];

async function seedBrokerData() {
  console.log('🌱 Seeding broker data...');

  try {
    for (const brokerData of BROKER_DATA) {
      console.log(`Creating broker: ${brokerData.name}`);
      
      // Create or find the broker
      const broker = await prisma.broker.upsert({
        where: { name: brokerData.name },
        update: {
          website: brokerData.website,
        },
        create: {
          name: brokerData.name,
          website: brokerData.website,
        },
      });

      // Add aliases
      for (const alias of brokerData.aliases) {
        try {
          await prisma.brokerAlias.upsert({
            where: { alias },
            update: {},
            create: {
              brokerId: broker.id,
              alias,
            },
          });
          console.log(`  ✓ Added alias: ${alias}`);
        } catch (error) {
          // Alias might already exist for another broker
          console.log(`  ⚠ Alias "${alias}" already exists, skipping`);
        }
      }
    }

    console.log('✅ Broker data seeding completed!');
    
    // Show summary
    const brokerCount = await prisma.broker.count();
    const aliasCount = await prisma.brokerAlias.count();
    
    console.log(`📊 Summary:`);
    console.log(`   Brokers: ${brokerCount}`);
    console.log(`   Aliases: ${aliasCount}`);

  } catch (error) {
    console.error('❌ Error seeding broker data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedBrokerData()
    .then(() => {
      console.log('🎉 Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedBrokerData };