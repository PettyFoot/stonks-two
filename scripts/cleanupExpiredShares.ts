#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredShares() {
  try {
    console.log('🧹 Starting cleanup of expired shared trades...');
    
    const now = new Date();
    
    // Find expired shares
    const expiredShares = await prisma.sharedTrade.findMany({
      where: {
        expiresAt: {
          lt: now
        }
      },
      select: {
        id: true,
        shareKey: true,
        expiresAt: true,
        accessCount: true,
        createdAt: true
      }
    });

    if (expiredShares.length === 0) {
      console.log('✅ No expired shares found');
      return;
    }

    console.log(`📊 Found ${expiredShares.length} expired shares to clean up`);

    // Log details of expired shares before deletion
    for (const share of expiredShares) {
      const daysSinceExpiry = Math.floor((now.getTime() - share.expiresAt.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = Math.floor((share.expiresAt.getTime() - share.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`   📄 Share ${share.shareKey}: expired ${daysSinceExpiry} days ago (lived ${totalDays} days, accessed ${share.accessCount} times)`);
    }

    // Delete expired shares
    const deleteResult = await prisma.sharedTrade.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`🗑️  Successfully deleted ${deleteResult.count} expired shared trades`);
    
    // Get stats on remaining shares
    const remainingShares = await prisma.sharedTrade.count();
    const nearExpiry = await prisma.sharedTrade.count({
      where: {
        expiresAt: {
          lt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      }
    });

    console.log(`📈 Remaining active shares: ${remainingShares}`);
    if (nearExpiry > 0) {
      console.log(`⏰ Shares expiring in next 24 hours: ${nearExpiry}`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupExpiredShares()
  .then(() => {
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });