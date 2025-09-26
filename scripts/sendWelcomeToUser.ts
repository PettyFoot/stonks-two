#!/usr/bin/env ts-node

/**
 * Script to send welcome email to a specific user by ID
 * Run with: npx dotenv -e .env.local -- npx tsx scripts/sendWelcomeToUser.ts
 */

import { prisma } from '../src/lib/prisma';
import { emailService } from '../src/lib/email/emailService';

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim() === '') {
    return 'Trader';
  }

  const firstName = fullName.trim().split(' ')[0];
  return firstName || 'Trader';
}

async function sendWelcomeToUser() {
  const userId = 'cmetebqgb0000uajo7mvvgowi';

  console.log('📧 Sending welcome email to user:', userId);

  if (!process.env.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM environment variable not set');
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com';
  const supportEmail = process.env.EMAIL_FROM;

  try {
    // Fetch user from database
    console.log('🔍 Looking up user in database...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      console.error('❌ User not found with ID:', userId);
      process.exit(1);
    }

    if (!user.email) {
      console.error('❌ User has no email address:', userId);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Name:', user.name || 'No name set');
    console.log('   Email:', user.email);
    console.log('   Created:', user.createdAt.toISOString());

    // Send welcome email
    console.log('\n📨 Sending welcome email...');
    await emailService.sendSignupWelcomeEmail({
      userName: getFirstName(user.name),
      userEmail: user.email,
      supportEmail: supportEmail,
      appUrl: appUrl
    });

    console.log('✅ Welcome email sent successfully!');
    console.log('📬 Email sent to:', user.email);
    console.log('🌐 Using app URL:', appUrl);

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
sendWelcomeToUser()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });