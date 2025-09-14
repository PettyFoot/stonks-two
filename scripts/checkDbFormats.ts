import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFormats() {
  console.log('📊 Checking CSV formats in database...\n');

  try {
    const formats = await prisma.brokerCsvFormat.findMany({
      include: { broker: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${formats.length} formats:\n`);

    formats.forEach((format, i) => {
      console.log(`${i + 1}. ${format.formatName} (${format.broker.name})`);
      console.log(`   - Fingerprint: ${format.headerFingerprint}`);
      console.log(`   - Headers: ${format.headers.join(', ')}`);

      if (format.sampleData) {
        console.log(`   - Sample data type: ${typeof format.sampleData}`);
        const sampleData = format.sampleData as any;
        if (sampleData.detectionPatterns) {
          console.log(`   - Has detection patterns: ${!!sampleData.detectionPatterns}`);
          if (sampleData.detectionPatterns.sampleValuePatterns) {
            console.log(`   - Sample value patterns:`, Object.keys(sampleData.detectionPatterns.sampleValuePatterns));
          }
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFormats();