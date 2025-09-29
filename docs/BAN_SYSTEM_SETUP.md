# User Ban System Setup Guide

This system prevents banned users from re-registering through any authentication method (email/password, Google, GitHub, etc.).

## Overview

When an admin immediately deletes a user, they are automatically added to the `banned_users` table. This table is checked by Auth0 before allowing new registrations.

## Components

### 1. Database Schema (`BannedUser` model)
- Stores banned user information including all identities
- Indexes on email, Auth0 ID, Google email, and GitHub username
- Tracks who banned them and why

### 2. Account Deletion Service
- Updated to capture Auth0 user identities before deletion
- Automatically creates a `BannedUser` entry on immediate deletion
- Stores all login methods (email, Google, GitHub, etc.)

### 3. Ban Check API Endpoint
- **Endpoint**: `POST /api/auth/check-banned`
- Called by Auth0 Pre-Registration Action
- Checks if email, Google account, or GitHub account is banned
- Secured with Bearer token authentication

### 4. Auth0 Pre-Registration Action
- Intercepts registration attempts before account creation
- Calls your ban check API
- Blocks registration if user is found in banned list
- Fails open (allows registration) if API is unreachable

## Setup Instructions

### Step 1: Verify Database Migration
The `banned_users` table should already be created. Verify with:
```bash
npx dotenv -e .env.local -- npx prisma studio
```
Check that the `BannedUser` model exists in your database.

### Step 2: Set Up Auth0 Action

1. **Go to Auth0 Dashboard**
   - Navigate to: Actions → Library → Build Custom

2. **Create New Action**
   - Name: `Block Banned Users from Registration`
   - Trigger: `Pre User Registration`
   - Runtime: Node 18

3. **Add Code**
   - Copy the code from `docs/auth0-pre-registration-action.js`
   - Paste it into the action editor

4. **Add Secrets**
   - Click on the "Secrets" (key icon) tab
   - Add two secrets:
     ```
     BAN_CHECK_API_URL = https://www.tradevoyageranalytics.com/api/auth/check-banned
     BAN_CHECK_API_SECRET = i4zo1Sfd6yWWOrsFHFU1IDcz1leJthhaO/1ngM+Kbos=
     ```
   - **IMPORTANT**: Use the exact secret from your `.env` file (`AUTH0_BAN_CHECK_SECRET`)

5. **Add Dependencies**
   - In the action editor, click "Add Dependency"
   - Add: `axios` (latest version)

6. **Deploy**
   - Click "Deploy" button

7. **Add to Flow**
   - Go to: Actions → Flows → Pre User Registration
   - Drag your action into the flow
   - Click "Apply"

### Step 3: Test the System

#### Test 1: Ban a User
1. Delete a user through admin panel (immediate delete)
2. Check `banned_users` table to verify entry was created
3. Verify their email, Google account, and GitHub account are recorded

#### Test 2: Block Re-Registration
1. Try to register with the banned email → Should be blocked
2. If they used Google: Try to sign up with same Google account → Should be blocked
3. If they used GitHub: Try to sign up with same GitHub account → Should be blocked

#### Test 3: API Endpoint
Test the ban check API directly:
```bash
curl -X POST https://www.tradevoyageranalytics.com/api/auth/check-banned \
  -H "Authorization: Bearer i4zo1Sfd6yWWOrsFHFU1IDcz1leJthhaO/1ngM+Kbos=" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Should return:
```json
{"isBanned": false}
```

Or if banned:
```json
{
  "isBanned": true,
  "reason": "Account not eligible for registration",
  "bannedAt": "2025-01-15T10:30:00.000Z"
}
```

## Security Considerations

1. **API Secret**: Keep `AUTH0_BAN_CHECK_SECRET` secure - it's stored in both:
   - Your `.env` file
   - Auth0 Action secrets

2. **Fail Open**: The system fails open (allows registration) if:
   - API is unreachable
   - API returns an error
   - Timeout occurs (5 seconds)

   This prevents blocking legitimate users due to temporary issues.

3. **Rate Limiting**: Consider adding rate limiting to the ban check endpoint if you experience abuse.

## Monitoring

### Check Ban Logs
View Auth0 logs to see ban check activity:
- Auth0 Dashboard → Monitoring → Logs
- Filter by action name: "Block Banned Users from Registration"

### Check Application Logs
Search for these log prefixes:
- `[BAN_CHECK]` - Ban check API calls
- `[IMMEDIATE_DELETION]` - User deletion and ban creation

## Troubleshooting

### Issue: Users can still register after being banned

**Check:**
1. Is the Auth0 Action deployed and added to the flow?
2. Are the secrets configured correctly in Auth0?
3. Is the API endpoint accessible from Auth0's servers?
4. Check Auth0 logs for errors

**Test the API:**
```bash
# From your server
curl https://www.tradevoyageranalytics.com/api/auth/check-banned
```

### Issue: Legitimate users are being blocked

**Check:**
1. Query the `banned_users` table to see if they were mistakenly added
2. Remove them from the banned list if it was an error:
   ```sql
   DELETE FROM banned_users WHERE email = 'user@example.com';
   ```

### Issue: Auth0 Action is timing out

**Solutions:**
1. Increase timeout in action code (currently 5 seconds)
2. Optimize the database query (indexes should already be in place)
3. Check database performance

## Future Enhancements

- [ ] Add admin UI to view and manage banned users
- [ ] Add ability to manually ban users without deletion
- [ ] Add IP address tracking and banning
- [ ] Add appeal/unban workflow
- [ ] Add ban expiration dates (temporary bans)
- [ ] Add webhook to notify admins when banned users attempt registration

## Related Files

- Database Schema: `prisma/schema.prisma` (BannedUser model)
- Deletion Service: `src/lib/services/accountDeletion.ts`
- Ban Check API: `src/app/api/auth/check-banned/route.ts`
- Auth0 Action: `docs/auth0-pre-registration-action.js`
- Auth0 Management: `src/lib/auth0Management.ts`