/**
 * Add database check constraints to feedback_responses table
 * This adds an extra security layer at the database level
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addConstraints() {
  console.log('Adding check constraints to feedback_responses table...\n');

  try {
    // Drop existing constraints if they exist
    const dropConstraints = [
      'DROP CONSTRAINT IF EXISTS check_question1_rating',
      'DROP CONSTRAINT IF EXISTS check_question2_rating',
      'DROP CONSTRAINT IF EXISTS check_question3_rating',
      'DROP CONSTRAINT IF EXISTS check_question4_rating',
      'DROP CONSTRAINT IF EXISTS check_question5_rating',
      'DROP CONSTRAINT IF EXISTS check_comment_length',
      'DROP CONSTRAINT IF EXISTS check_username_length',
      'DROP CONSTRAINT IF EXISTS check_useremail_length',
    ];

    for (const constraint of dropConstraints) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE feedback_responses ${constraint}`);
      } catch {
        // Ignore errors if constraint doesn't exist
      }
    }

    // Add check constraints for rating ranges (1-10)
    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_question1_rating CHECK ("question1Rating" >= 1 AND "question1Rating" <= 10)
    `;
    console.log('✓ Added constraint: check_question1_rating');

    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_question2_rating CHECK ("question2Rating" >= 1 AND "question2Rating" <= 10)
    `;
    console.log('✓ Added constraint: check_question2_rating');

    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_question3_rating CHECK ("question3Rating" >= 1 AND "question3Rating" <= 10)
    `;
    console.log('✓ Added constraint: check_question3_rating');

    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_question4_rating CHECK ("question4Rating" >= 1 AND "question4Rating" <= 10)
    `;
    console.log('✓ Added constraint: check_question4_rating');

    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_question5_rating CHECK ("question5Rating" >= 1 AND "question5Rating" <= 10)
    `;
    console.log('✓ Added constraint: check_question5_rating');

    // Add check constraint for comment length
    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_comment_length CHECK (LENGTH(comment) <= 5000)
    `;
    console.log('✓ Added constraint: check_comment_length');

    // Add check constraint for userName length
    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_username_length CHECK (LENGTH("userName") <= 255)
    `;
    console.log('✓ Added constraint: check_username_length');

    // Add check constraint for userEmail length
    await prisma.$executeRaw`
      ALTER TABLE feedback_responses
      ADD CONSTRAINT check_useremail_length CHECK (LENGTH("userEmail") <= 255)
    `;
    console.log('✓ Added constraint: check_useremail_length');

    console.log('\n✅ All check constraints added successfully!');

    // Verify constraints were added
    const constraints = await prisma.$queryRaw<Array<{
      constraint_name: string;
      constraint_type: string;
      constraint_definition: string;
    }>>`
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'feedback_responses'::regclass
        AND contype = 'c'
      ORDER BY conname
    `;

    console.log('\nVerified constraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.constraint_definition}`);
    });

  } catch (error) {
    console.error('Error adding constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addConstraints()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });