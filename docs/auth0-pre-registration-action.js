/**
 * Auth0 Pre-User Registration Action
 *
 * This action blocks banned users from registering new accounts.
 *
 * INSTALLATION INSTRUCTIONS:
 * 1. Go to Auth0 Dashboard → Actions → Library → Build Custom
 * 2. Name: "Block Banned Users from Registration"
 * 3. Trigger: Pre User Registration
 * 4. Copy this code into the action
 * 5. Add Secret: BAN_CHECK_API_URL = https://www.tradevoyageranalytics.com/api/auth/check-banned
 * 6. Add Secret: BAN_CHECK_API_SECRET = [generate a secure secret and add to your .env]
 * 7. Deploy the action
 * 8. Add to the Pre User Registration flow
 */

const axios = require('axios');

exports.onExecutePreUserRegistration = async (event, api) => {
  const email = event.user.email;
  const identities = event.user.identities || [];

  // Extract identity information
  const googleEmail = identities.find(i => i.provider === 'google-oauth2')?.user_id;
  const githubUsername = identities.find(i => i.provider === 'github')?.user_id;

  try {
    // Call your API to check if user is banned
    const response = await axios.post(
      event.secrets.BAN_CHECK_API_URL,
      {
        email: email,
        googleEmail: googleEmail,
        githubUsername: githubUsername
      },
      {
        headers: {
          'Authorization': `Bearer ${event.secrets.BAN_CHECK_API_SECRET}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      }
    );

    if (response.data.isBanned) {
      // User is banned - deny registration
      api.access.deny(
        'registration_blocked',
        'This account is not eligible to register. If you believe this is an error, please contact support.'
      );

      console.log(`[BAN_CHECK] Blocked registration attempt for banned user: ${email}`);
    } else {
      console.log(`[BAN_CHECK] Allowed registration for: ${email}`);
    }
  } catch (error) {
    // Log error but allow registration to proceed (fail open)
    // This prevents blocking legitimate users if API is down
    console.error('[BAN_CHECK] Error checking ban status:', error.message);
    console.log('[BAN_CHECK] Allowing registration due to API error (fail open)');
  }
};