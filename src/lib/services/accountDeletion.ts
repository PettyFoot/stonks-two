import { prisma } from '@/lib/prisma';
import { DeletionAction } from '@prisma/client';

export interface AccountDeletionService {
  softDelete(userId: string, reason?: string): Promise<void>;
  anonymizeUserData(userId: string): Promise<void>;
  hardDelete(userId: string): Promise<void>;
  isWithinGracePeriod(userId: string): Promise<boolean>;
  scheduleBackgroundJobs(): Promise<void>;
}

class AccountDeletionServiceImpl implements AccountDeletionService {
  
  /**
   * Soft delete user account - blocks access but keeps data intact
   */
  async softDelete(userId: string, reason?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, deletionRequestedAt: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.deletionRequestedAt) {
      throw new Error('Account deletion already requested');
    }

    await prisma.$transaction(async (tx) => {
      // Update user with soft delete timestamp
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deletionReason: reason,
          updatedAt: new Date(),
        }
      });

      // Log the soft deletion
      await tx.accountDeletionLog.create({
        data: {
          userId,
          userEmail: user.email,
          action: DeletionAction.SOFT_DELETED,
          performedBy: 'system',
          reason,
          details: {
            timestamp: new Date().toISOString(),
            action: 'soft_delete_executed'
          }
        }
      });

      // Cancel any active sessions (would need session management)
      // This is a placeholder - implement based on your session strategy

    });
  }

  /**
   * Anonymize user data while retaining necessary business records
   */
  async anonymizeUserData(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        name: true,
        deletedAt: true,
        anonymizedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.anonymizedAt) {

      return;
    }

    if (!user.deletedAt) {
      throw new Error('Cannot anonymize user that has not been soft deleted');
    }

    await prisma.$transaction(async (tx) => {
      // Generate anonymous identifiers
      const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const anonymousEmail = `deleted_${Date.now()}@anonymized.local`;

      // Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          name: `Deleted User ${Date.now()}`,
          auth0Id: anonymousId,
          anonymizedAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Anonymize related trading data - keep structure but remove identifying info
      // This preserves analytical value while protecting privacy
      await tx.trade.updateMany({
        where: { userId },
        data: {
          // Keep trade data but could anonymize notes if they exist
          updatedAt: new Date()
        }
      });

      // Anonymize records entries
      await tx.recordsEntry.updateMany({
        where: { userId },
        data: {
          // Could anonymize notes/content if they contain personal info
          updatedAt: new Date()
        }
      });

      // Delete sensitive import data
      await tx.csvUploadLog.deleteMany({
        where: { userId }
      });

      // Delete import batches (CSV upload history)
      await tx.importBatch.deleteMany({
        where: { userId }
      });

      // Log the anonymization
      await tx.accountDeletionLog.create({
        data: {
          userId: anonymousId, // Use new anonymous ID
          userEmail: user.email, // Keep original for audit
          action: DeletionAction.HARD_DELETED,
          performedBy: 'system',
          details: {
            timestamp: new Date().toISOString(),
            originalEmail: user.email,
            originalName: user.name,
            anonymizedId: anonymousId,
            action: 'data_anonymized'
          }
        }
      });


    });
  }

  /**
   * Permanently delete user and all associated data
   */
  async hardDelete(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true,
        deletedAt: true,
        anonymizedAt: true,
        finalDeletionAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.finalDeletionAt || new Date() < user.finalDeletionAt) {
      throw new Error('Cannot perform hard delete - final deletion date not reached');
    }

    await prisma.$transaction(async (tx) => {
      const originalEmail = user.email;

      // Delete all user data in correct order (respecting foreign keys)
      
      // 1. Skip webhook events (no user-specific filtering available)

      // 2. Delete payment history
      await tx.paymentHistory.deleteMany({
        where: { userId }
      });

      // 3. Delete subscriptions
      await tx.subscription.deleteMany({
        where: { userId }
      });

      // 4. Delete import-related data
      await tx.csvUploadLog.deleteMany({
        where: { userId }
      });

      await tx.importBatch.deleteMany({
        where: { userId }
      });

      // 5. Delete trading data
      await tx.recordsEntry.deleteMany({
        where: { userId }
      });

      // Note: dayData and partialFill tables have been removed

      // Delete orders
      await tx.order.deleteMany({
        where: { userId }
      });

      // Delete trades
      await tx.trade.deleteMany({
        where: { userId }
      });

      // 6. Log final deletion before deleting audit trail
      await tx.accountDeletionLog.create({
        data: {
          userId: `deleted_${Date.now()}`,
          userEmail: originalEmail,
          action: DeletionAction.HARD_DELETED,
          performedBy: 'system',
          details: {
            timestamp: new Date().toISOString(),
            originalUserId: userId,
            finalDeletion: true
          },
          completedAt: new Date()
        }
      });

      // 7. Delete user audit trail (except the final log above)
      await tx.accountDeletionLog.deleteMany({
        where: { 
          userId,
          action: { not: DeletionAction.HARD_DELETED }
        }
      });

      // 8. Finally, delete the user
      await tx.user.delete({
        where: { id: userId }
      });


    });
  }

  /**
   * Reactivate account triggered by login (if within grace period)
   */
  async reactivateOnLogin(userId: string, userEmail: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        anonymizedAt: true,
        canReactivate: true,
        finalDeletionAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if reactivation is possible
    if (!user.deletionRequestedAt && !user.deletedAt) {
      return true; // Account is already active
    }

    if (user.anonymizedAt) {
      return false; // Cannot reactivate anonymized account
    }

    if (user.finalDeletionAt && new Date() > user.finalDeletionAt) {
      return false; // Past final deletion date
    }

    if (!user.canReactivate) {
      return false; // Not allowed to reactivate
    }

    // Perform reactivation
    await prisma.$transaction(async (tx) => {
      // Clear deletion fields
      await tx.user.update({
        where: { id: userId },
        data: {
          deletionRequestedAt: null,
          deletedAt: null,
          deletionReason: null,
          finalDeletionAt: null,
          canReactivate: true,
          updatedAt: new Date(),
        }
      });

      // Log the reactivation
      await tx.accountDeletionLog.create({
        data: {
          userId,
          userEmail,
          action: DeletionAction.REACTIVATED,
          performedBy: userId,
          reason: 'Reactivated via login',
          details: {
            timestamp: new Date().toISOString(),
            method: 'login_reactivation',
            reactivatedAt: new Date().toISOString()
          }
        }
      });
    });


    return true;
  }

  /**
   * Check if user is still within reactivation grace period
   */
  async isWithinGracePeriod(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        canReactivate: true,
        finalDeletionAt: true
      }
    });

    if (!user || !user.deletionRequestedAt) {
      return false;
    }

    // Check if still within the grace period
    if (user.finalDeletionAt && new Date() > user.finalDeletionAt) {
      return false;
    }

    // Check if soft deleted but can still reactivate
    return user.canReactivate || false;
  }

  /**
   * Schedule background jobs for processing deletions
   * This would integrate with your job queue system
   */
  async scheduleBackgroundJobs(): Promise<void> {
    // Find users needing soft deletion (30 days after request)
    const usersNeedingSoftDelete = await prisma.user.findMany({
      where: {
        deletionRequestedAt: { 
          not: null,
          lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        deletedAt: null
      },
      select: { id: true, email: true }
    });

    // Find users needing anonymization (30 days after soft delete)
    const usersNeedingAnonymization = await prisma.user.findMany({
      where: {
        deletedAt: { 
          not: null,
          lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        anonymizedAt: null
      },
      select: { id: true, email: true }
    });

    // Find users needing hard deletion (90 days after request)
    const usersNeedingHardDelete = await prisma.user.findMany({
      where: {
        finalDeletionAt: {
          not: null,
          lte: new Date() // Past the final deletion date
        }
      },
      select: { id: true, email: true }
    });

    // Process each category
    for (const user of usersNeedingSoftDelete) {
      try {
        await this.softDelete(user.id, 'Automatic soft delete after grace period');
      } catch (error) {
        console.error(`[SCHEDULED_DELETION] Failed to soft delete user ${user.id}:`, error);
      }
    }

    for (const user of usersNeedingAnonymization) {
      try {
        await this.anonymizeUserData(user.id);
      } catch (error) {
        console.error(`[SCHEDULED_DELETION] Failed to anonymize user ${user.id}:`, error);
      }
    }

    for (const user of usersNeedingHardDelete) {
      try {
        await this.hardDelete(user.id);
      } catch (error) {
        console.error(`[SCHEDULED_DELETION] Failed to hard delete user ${user.id}:`, error);
      }
    }


  }

  /**
   * Get detailed deletion status for a user
   */
  async getDeletionStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionRequestedAt: true,
        deletedAt: true,
        deletionReason: true,
        anonymizedAt: true,
        finalDeletionAt: true,
        canReactivate: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const logs = await prisma.accountDeletionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        action: true,
        reason: true,
        createdAt: true,
        scheduledFor: true,
        completedAt: true,
        details: true
      }
    });

    return {
      user,
      logs,
      status: {
        isRequested: !!user.deletionRequestedAt,
        isSoftDeleted: !!user.deletedAt,
        isAnonymized: !!user.anonymizedAt,
        canReactivate: user.canReactivate,
        withinGracePeriod: await this.isWithinGracePeriod(userId)
      }
    };
  }
}

// Export singleton instance
export const accountDeletionService = new AccountDeletionServiceImpl();