# Database Safety Guidelines

## ⚠️ CRITICAL WARNING

**NEVER run `prisma migrate reset` or similar commands without using the safe scripts provided!**

The users table contains critical authentication data linked to Auth0 that **MUST NEVER BE DELETED**.

## Protected Tables

The following tables are considered **protected** and should never be deleted:

- **`users`** - Contains Auth0 authentication data and user profiles

## Safe Database Operations

### 🛡️ Safe Reset (Preserves Users)

To reset the database while preserving users:

```bash
# Safe reset - preserves users table
tsx scripts/safe-reset.ts --force
```

### 💾 Backup Users Before Risky Operations

Always backup users before any risky database operations:

```bash
# Create a backup
tsx scripts/backup-users.ts create

# List available backups
tsx scripts/backup-users.ts list

# Restore from backup (if needed)
tsx scripts/backup-users.ts restore users-backup-YYYY-MM-DD.json --force
```

## 🚫 DANGEROUS COMMANDS TO AVOID

**NEVER run these commands directly:**

```bash
# ❌ DANGEROUS - Will delete ALL data including users
prisma migrate reset

# ❌ DANGEROUS - Will delete ALL data including users  
prisma db push --reset

# ❌ DANGEROUS - Manual table drops without protection
DROP TABLE users;
```

## 📋 Safe Scripts Reference

### Safe Reset Script (`scripts/safe-reset.ts`)

**Purpose:** Reset database while preserving users table

**Features:**
- Automatically backs up users table
- Drops all non-protected tables
- Applies new schema
- Restores users data
- Creates file backups for additional safety

**Usage:**
```bash
# Development reset (preserves users)
tsx scripts/safe-reset.ts --force

# Check what would be reset (dry run)
tsx scripts/safe-reset.ts
```

### User Backup Script (`scripts/backup-users.ts`)

**Purpose:** Backup and restore users table

**Commands:**
```bash
# Create backup
tsx scripts/backup-users.ts create

# List all backups
tsx scripts/backup-users.ts list

# Get backup info
tsx scripts/backup-users.ts info users-backup-2024-01-01T12-00-00.json

# Restore from backup
tsx scripts/backup-users.ts restore users-backup-2024-01-01T12-00-00.json --force

# Clean old backups (keep 10 most recent)
tsx scripts/backup-users.ts clean
```

## 🔄 Recommended Workflow

### For Schema Changes:

1. **Backup users first:**
   ```bash
   tsx scripts/backup-users.ts create
   ```

2. **Use safe reset:**
   ```bash
   tsx scripts/safe-reset.ts --force
   ```

3. **Verify users are preserved:**
   - Check users table has data
   - Test authentication still works

### For Development Testing:

1. **Use safe reset instead of migrate reset:**
   ```bash
   tsx scripts/safe-reset.ts --force
   ```

2. **Re-import test data if needed:**
   ```bash
   npm run trades:calc
   ```

## 🏗️ How Protection Works

### Safe Reset Process:

1. **Backup Phase:**
   - Queries all users from database
   - Saves to memory and file backup
   - Logs backup location and user count

2. **Reset Phase:**
   - Identifies non-protected tables
   - Disables foreign key constraints
   - Drops only non-protected tables
   - Keeps users table intact

3. **Schema Phase:**
   - Runs `prisma db push` to apply new schema
   - Creates new tables and relationships

4. **Restore Phase:**
   - Restores users data from backup
   - Maintains Auth0 relationships
   - Verifies data integrity

## 🚨 Emergency Recovery

If users table was accidentally deleted:

1. **Check for automatic backups:**
   ```bash
   tsx scripts/backup-users.ts list
   ```

2. **Restore from most recent backup:**
   ```bash
   tsx scripts/backup-users.ts restore users-backup-latest.json --force
   ```

3. **Verify Auth0 integration still works**

4. **Check backup files in `scripts/backups/` directory**

## 📁 Backup Storage

Backups are stored in:
```
scripts/
  backups/
    users-backup-YYYY-MM-DDTHH-MM-SS.json  (timestamped backups)
    users-backup-latest.json               (latest backup symlink)
```

## 🔧 Environment Protection

Set environment protection flag:

```env
# .env.local
PROTECT_USERS_TABLE=true
```

## 📦 Package.json Scripts

Use these safe scripts in package.json:

```json
{
  "scripts": {
    "db:safe-reset": "tsx scripts/safe-reset.ts --force",
    "db:backup-users": "tsx scripts/backup-users.ts create",
    "db:restore-users": "tsx scripts/backup-users.ts restore",
    "db:list-backups": "tsx scripts/backup-users.ts list"
  }
}
```

## 🎯 Best Practices

1. **Always backup before schema changes**
2. **Use safe scripts instead of direct Prisma commands**
3. **Test authentication after any database operation**
4. **Keep multiple backup generations**
5. **Document any manual database operations**
6. **Never commit sensitive backup files to git**

## 🔍 Verification Checklist

After any database operation, verify:

- [ ] Users table exists and has data
- [ ] User count matches pre-operation count  
- [ ] Auth0 login still works
- [ ] User relationships are intact
- [ ] No authentication errors in logs

## 📞 Emergency Contacts

If you accidentally delete critical data:

1. **Stop all database operations immediately**
2. **Check backup files first**
3. **Document what happened**
4. **Use restore scripts to recover**
5. **Test all functionality after recovery**

---

**Remember: It's always easier to prevent data loss than to recover from it!** 🛡️