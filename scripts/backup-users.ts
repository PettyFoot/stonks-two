#!/usr/bin/env tsx

/**
 * User Table Backup Utility
 * 
 * This script creates backups of the users table and provides restore functionality.
 * It can be run manually or automatically before risky database operations.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface UserBackup {
  id: string;
  auth0Id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BackupMetadata {
  timestamp: string;
  userCount: number;
  backupFile: string;
  databaseUrl: string;
}

/**
 * Get the backups directory path
 */
function getBackupsDirectory(): string {
  const backupDir = path.join(process.cwd(), 'scripts', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * Create a backup of the users table
 */
async function createBackup(): Promise<BackupMetadata> {
  console.log('🔄 Creating users table backup...');
  
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replace(/[:.]/g, '-');
  const backupDir = getBackupsDirectory();
  const backupFile = path.join(backupDir, `users-backup-${fileTimestamp}.json`);
  
  const backupData = {
    metadata: {
      timestamp,
      userCount: users.length,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') || 'unknown', // Hide password
      version: '1.0'
    },
    users: users
  };
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  const metadata: BackupMetadata = {
    timestamp,
    userCount: users.length,
    backupFile: path.basename(backupFile),
    databaseUrl: backupData.metadata.databaseUrl
  };
  
  console.log(`✅ Backup created: ${path.basename(backupFile)}`);
  console.log(`📊 Backed up ${users.length} users`);
  
  // Also update the latest backup symlink/reference
  const latestFile = path.join(backupDir, 'users-backup-latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(backupData, null, 2));
  
  return metadata;
}

/**
 * List all available backups
 */
function listBackups(): string[] {
  const backupDir = getBackupsDirectory();
  const files = fs.readdirSync(backupDir);
  
  return files
    .filter(file => file.startsWith('users-backup-') && file.endsWith('.json') && file !== 'users-backup-latest.json')
    .sort()
    .reverse(); // Most recent first
}

/**
 * Restore users from a backup file
 */
async function restoreFromBackup(backupFileName: string): Promise<void> {
  console.log(`🔄 Restoring users from backup: ${backupFileName}`);
  
  const backupDir = getBackupsDirectory();
  const backupFile = path.join(backupDir, backupFileName);
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFileName}`);
  }
  
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const users: UserBackup[] = backupData.users;
  
  console.log(`📊 Restoring ${users.length} users from ${backupData.metadata.timestamp}`);
  
  // Clear existing users (with confirmation)
  const existingUsers = await prisma.user.findMany();
  if (existingUsers.length > 0) {
    console.log(`⚠️  Found ${existingUsers.length} existing users. They will be replaced.`);
  }
  
  // Delete existing users
  await prisma.user.deleteMany();
  console.log('🗑️  Cleared existing users');
  
  // Restore users from backup
  let restoredCount = 0;
  for (const user of users) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          auth0Id: user.auth0Id,
          email: user.email,
          name: user.name,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
      restoredCount++;
    } catch (error) {
      console.warn(`⚠️  Warning: Could not restore user ${user.email}:`, error);
    }
  }
  
  console.log(`✅ Restored ${restoredCount} users`);
}

/**
 * Get backup file information
 */
function getBackupInfo(backupFileName: string): any {
  const backupDir = getBackupsDirectory();
  const backupFile = path.join(backupDir, backupFileName);
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFileName}`);
  }
  
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  return {
    ...backupData.metadata,
    fileName: backupFileName,
    fileSize: fs.statSync(backupFile).size,
    users: backupData.users.length
  };
}

/**
 * Clean old backups (keep only the most recent N backups)
 */
function cleanOldBackups(keepCount: number = 10): void {
  console.log(`🧹 Cleaning old backups (keeping ${keepCount} most recent)...`);
  
  const backups = listBackups();
  const toDelete = backups.slice(keepCount);
  
  const backupDir = getBackupsDirectory();
  toDelete.forEach(file => {
    const filePath = path.join(backupDir, file);
    fs.unlinkSync(filePath);
    console.log(`🗑️  Deleted old backup: ${file}`);
  });
  
  console.log(`✅ Cleaned ${toDelete.length} old backups`);
}

/**
 * Main CLI function
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'create':
      case 'backup':
        await createBackup();
        break;
        
      case 'list':
        const backups = listBackups();
        console.log('📋 Available backups:');
        if (backups.length === 0) {
          console.log('   No backups found');
        } else {
          backups.forEach((backup, index) => {
            console.log(`   ${index + 1}. ${backup}`);
          });
        }
        break;
        
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Please specify a backup file to restore from');
          console.log('Usage: tsx scripts/backup-users.ts restore <backup-file>');
          process.exit(1);
        }
        
        if (!process.argv.includes('--force')) {
          console.error('❌ Restore requires --force flag for safety');
          console.log('Usage: tsx scripts/backup-users.ts restore <backup-file> --force');
          process.exit(1);
        }
        
        await restoreFromBackup(backupFile);
        break;
        
      case 'info':
        const infoFile = process.argv[3];
        if (!infoFile) {
          console.error('❌ Please specify a backup file to get info for');
          process.exit(1);
        }
        
        const info = getBackupInfo(infoFile);
        console.log('📋 Backup Information:');
        console.log(`   File: ${info.fileName}`);
        console.log(`   Timestamp: ${info.timestamp}`);
        console.log(`   Users: ${info.users}`);
        console.log(`   File Size: ${(info.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   Database: ${info.databaseUrl}`);
        break;
        
      case 'clean':
        const keepCount = parseInt(process.argv[3] || '10');
        cleanOldBackups(keepCount);
        break;
        
      default:
        console.log('📖 User Backup Utility');
        console.log('');
        console.log('Commands:');
        console.log('  create                    - Create a new backup');
        console.log('  list                      - List all available backups');
        console.log('  restore <file> --force    - Restore from backup file');
        console.log('  info <file>               - Show backup file information');
        console.log('  clean [keep-count]        - Clean old backups (default: keep 10)');
        console.log('');
        console.log('Examples:');
        console.log('  tsx scripts/backup-users.ts create');
        console.log('  tsx scripts/backup-users.ts list');
        console.log('  tsx scripts/backup-users.ts restore users-backup-2024-01-01T00-00-00.json --force');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { createBackup, restoreFromBackup, listBackups, getBackupInfo, cleanOldBackups };