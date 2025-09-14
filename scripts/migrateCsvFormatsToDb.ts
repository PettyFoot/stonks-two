import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCsvFormatsToDatabase() {
  console.log('Starting migration of hardcoded CSV formats to database...\n');

  try {
    // First, ensure we have the Interactive Brokers broker entry
    const ibBroker = await prisma.broker.upsert({
      where: { name: 'Interactive Brokers' },
      update: {},
      create: {
        name: 'Interactive Brokers',
        website: 'https://www.interactivebrokers.com',
      }
    });

    // Ensure TD Ameritrade broker entry
    const tdBroker = await prisma.broker.upsert({
      where: { name: 'TD Ameritrade' },
      update: {},
      create: {
        name: 'TD Ameritrade',
        website: 'https://www.tdameritrade.com',
      }
    });

    // Ensure E*TRADE broker entry
    const etradeBroker = await prisma.broker.upsert({
      where: { name: 'E*TRADE' },
      update: {},
      create: {
        name: 'E*TRADE',
        website: 'https://us.etrade.com',
      }
    });

    // Ensure Charles Schwab broker entry
    const schwabBroker = await prisma.broker.upsert({
      where: { name: 'Charles Schwab' },
      update: {},
      create: {
        name: 'Charles Schwab',
        website: 'https://www.schwab.com',
      }
    });

    // Map broker names to broker IDs
    const brokerMap: { [key: string]: string } = {
      'Interactive Brokers': ibBroker.id,
      'TD Ameritrade': tdBroker.id,
      'E*TRADE': etradeBroker.id,
      'Charles Schwab': schwabBroker.id,
    };

    // Note: CSV formats have already been migrated to the database
    // This migration script is kept for reference but the formats are now stored
    // in the broker_csv_formats table and managed through the admin interface
    console.log('Migration already completed - formats are stored in database');

    // List all formats now in the database
    console.log('\n📊 Summary of broker_csv_formats in database:');
    const allFormats = await prisma.brokerCsvFormat.findMany({
      include: {
        broker: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\nTotal formats in database: ${allFormats.length}`);
    allFormats.forEach((format, index) => {
      console.log(`${index + 1}. ${format.formatName} (${format.broker.name})`);
      console.log(`   - ID: ${format.id}`);
      console.log(`   - Fingerprint: ${format.headerFingerprint}`);
      console.log(`   - Confidence: ${format.confidence}`);
      console.log(`   - Usage Count: ${format.usageCount}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateCsvFormatsToDatabase()
  .then(() => {
    console.log('\n✨ Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });