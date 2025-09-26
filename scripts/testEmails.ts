#!/usr/bin/env ts-node

/**
 * Test script to send sample emails to preview email templates
 * Run with: npx dotenv -e .env.local -- npx tsx scripts/testEmails.ts
 */

import { emailService } from '../src/lib/email/emailService';

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim() === '') {
    return 'Trader';
  }

  const firstName = fullName.trim().split(' ')[0];
  return firstName || 'Trader';
}

async function sendTestEmails() {
  console.log('🧪 Starting email template test...');
  console.log('📧 All test emails will be sent to:', process.env.EMAIL_FROM);

  if (!process.env.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM environment variable not set');
    process.exit(1);
  }

  const testEmailAddress = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com';

  try {
    // Test 1: New User Signup Welcome Email
    console.log('\n📨 Sending Test 1: New User Signup Welcome Email...');
    await emailService.sendSignupWelcomeEmail({
      userName: getFirstName('Test User'),
      userEmail: testEmailAddress,
      supportEmail: testEmailAddress,
      appUrl: appUrl
    });
    console.log('✅ New user welcome email sent successfully');

    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Premium Subscription Welcome Email (always with trial)
    console.log('\n📨 Sending Test 2: Premium Subscription Welcome Email...');
    await emailService.sendSubscriptionWelcomeEmail({
      userName: getFirstName('Test Premium User'),
      userEmail: testEmailAddress,
      subscriptionTier: 'Premium',
      trialEndDate: 'October 10, 2025',
      customerPortalUrl: `${appUrl}/settings`,
      supportEmail: testEmailAddress,
      appUrl: appUrl
    });
    console.log('✅ Premium subscription welcome email sent successfully');

    // Wait a moment between emails
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Admin New User Notification
    console.log('\n📨 Sending Test 3: Admin New User Notification...');
    await emailService.sendNewUserNotification({
      name: 'Test User',
      email: 'testuser@example.com',
      auth0Id: 'auth0|test123456789',
      signupTime: new Date()
    });
    console.log('✅ Admin notification email sent successfully');

    console.log('\n🎉 All test emails sent successfully!');
    console.log('📬 Check your inbox at:', testEmailAddress);
    console.log('\n📋 Test Summary:');
    console.log('   1. New User Signup Welcome Email');
    console.log('   2. Premium Subscription Welcome Email (14-day trial)');
    console.log('   3. Admin New User Notification');

  } catch (error) {
    console.error('❌ Error sending test emails:', error);
    process.exit(1);
  }
}

// Run the test
sendTestEmails()
  .then(() => {
    console.log('\n✨ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });