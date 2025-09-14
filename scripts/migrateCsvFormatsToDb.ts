import { PrismaClient } from '@prisma/client';
import { KNOWN_CSV_FORMATS } from '../src/lib/csvFormatRegistry';

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

    // Migrate each format
    for (const format of KNOWN_CSV_FORMATS) {
      const brokerId = brokerMap[format.brokerName || ''];

      if (!brokerId) {
        console.log(`⚠️  Skipping format ${format.id} - no broker mapping found for: ${format.brokerName}`);
        continue;
      }

      // Extract headers from the format
      const headers = format.detectionPatterns.headerPattern;

      // Create or update the format in the database
      try {
        const existingFormat = await prisma.brokerCsvFormat.findFirst({
          where: {
            brokerId: brokerId,
            headerFingerprint: format.fingerprint
          }
        });

        if (existingFormat) {
          console.log(`✓ Format already exists: ${format.name} (${format.id})`);
          continue;
        }

        const dbFormat = await prisma.brokerCsvFormat.create({
          data: {
            brokerId: brokerId,
            formatName: format.name,
            description: format.description,
            headerFingerprint: format.fingerprint,
            headers: headers,
            sampleData: {
              fieldMappings: format.fieldMappings,
              detectionPatterns: format.detectionPatterns,
              examples: Object.entries(format.fieldMappings).reduce((acc, [key, value]) => {
                acc[key] = value.examples;
                return acc;
              }, {} as Record<string, string[]>)
            },
            fieldMappings: format.fieldMappings,
            confidence: format.confidence,
            usageCount: format.usageCount,
            successRate: 1.0,
            createdBy: 'system-migration',
            lastUsed: null
          }
        });

        console.log(`✅ Successfully migrated: ${format.name} (${format.id})`);
        console.log(`   - Broker: ${format.brokerName}`);
        console.log(`   - Headers: ${headers.join(', ')}`);
        console.log(`   - Database ID: ${dbFormat.id}\n`);

      } catch (error) {
        console.error(`❌ Error migrating format ${format.id}:`, error);
      }
    }

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