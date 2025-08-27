#!/usr/bin/env tsx

/**
 * Safe Database Reset Script
 * 
 * This script resets the database while preserving critical tables like 'users'.
 * It backs up protected tables, drops all other tables, applies the schema,
 * and restores the protected data.
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Define protected tables that should never be deleted
const PROTECTED_TABLES = ['users'];

interface UserBackup {
  id: string;
  auth0Id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Backup protected tables to temporary storage
 */
async function backupProtectedTables(): Promise<{ users: UserBackup[] }> {
  console.log('🔄 Backing up protected tables...');
  
  const backup = {
    users: await prisma.user.findMany()
  };
  
  console.log(`✅ Backed up ${backup.users.length} users`);
  
  // Also save to file as additional safety
  const backupDir = path.join(process.cwd(), 'scripts', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `users-backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup.users, null, 2));
  console.log(`💾 Backup saved to: ${backupFile}`);
  
  return backup;
}

/**
 * Restore protected tables from backup
 */
async function restoreProtectedTables(backup: { users: UserBackup[] }) {
  console.log('🔄 Restoring protected tables...');
  
  // Restore users
  for (const user of backup.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        updatedAt: new Date()
      },
      create: {
        id: user.id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }
  
  console.log(`✅ Restored ${backup.users.length} users`);
}

/**
 * Get list of all tables except protected ones
 */
async function getNonProtectedTables(): Promise<string[]> {
  const result = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN (${PROTECTED_TABLES.map(table => `'${table}'`).join(',')})
    AND tablename NOT LIKE '_prisma%'
  `;
  
  return result.map(row => row.tablename);
}

/**
 * Drop non-protected tables
 */
async function dropNonProtectedTables() {
  console.log('🔄 Dropping non-protected tables...');
  
  const tablesToDrop = await getNonProtectedTables();
  console.log(`Tables to drop: ${tablesToDrop.join(', ')}`);
  
  // Disable foreign key constraints temporarily
  await prisma.$executeRaw`SET session_replication_role = replica;`;
  
  for (const table of tablesToDrop) {
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`✅ Dropped table: ${table}`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not drop table ${table}:`, error);
    }
  }
  
  // Re-enable foreign key constraints
  await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
}

/**
 * Run prisma db push to create new schema
 */
async function applySchema(): Promise<void> {
  console.log('🔄 Applying database schema...');
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['dotenv', '-e', '.env.local', '--', 'npx', 'prisma', 'db', 'push', '--accept-data-loss'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Schema applied successfully');
        resolve();
      } else {
        reject(new Error(`Schema application failed with code ${code}`));
      }
    });
  });
}

/**
 * Main function to perform safe reset
 */
async function safeReset() {
  console.log('🚀 Starting safe database reset...');
  console.log('⚠️  This will reset all data EXCEPT users table');
  
  // Check if we should proceed
  const shouldProceed = process.argv.includes('--force') || process.env.NODE_ENV === 'development';
  if (!shouldProceed) {
    console.error('❌ Safe reset requires --force flag or NODE_ENV=development');
    console.log('Usage: tsx scripts/safe-reset.ts --force');
    process.exit(1);
  }
  
  try {
    // Step 1: Backup protected tables
    const backup = await backupProtectedTables();
    
    // Step 2: Drop non-protected tables
    await dropNonProtectedTables();
    
    // Step 3: Apply new schema
    await applySchema();
    
    // Step 4: Restore protected tables
    await restoreProtectedTables(backup);
    
    console.log('🎉 Safe database reset completed successfully!');
    console.log(`📊 Preserved: ${backup.users.length} users`);
    
  } catch (error) {
    console.error('❌ Safe reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  safeReset().catch(console.error);
}

export { safeReset, backupProtectedTables, restoreProtectedTables };