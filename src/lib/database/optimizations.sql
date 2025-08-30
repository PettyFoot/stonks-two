-- Database Query Optimizations for Premium Membership System
-- Run these to improve performance of subscription-related queries

-- ==================================================
-- INDEXES FOR SUBSCRIPTION QUERIES
-- ==================================================

-- Optimize user subscription lookups (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_subscription_status"
ON "users"("subscriptionStatus", "subscriptionTier") 
WHERE "subscriptionStatus" IS NOT NULL;

-- Optimize subscription filtering by user and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_user_status_active"
ON "subscriptions"("userId", "status", "currentPeriodEnd")
WHERE "status" IN ('ACTIVE', 'TRIALING', 'PAST_DUE');

-- Optimize webhook event processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_webhook_events_processing"
ON "webhookEvent"("processed", "eventType", "createdAt")
WHERE "processed" = false;

-- Optimize payment history queries for billing tab
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_history_user_date"
ON "paymentHistory"("userId", "createdAt" DESC, "status");

-- Optimize usage records for current billing period
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usage_records_billing_period"
ON "usageRecords"("userId", "billingPeriod", "usageType", "usageDate" DESC);

-- ==================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ==================================================

-- Only index active subscriptions (most queries filter by this)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_active_only"
ON "subscriptions"("userId", "currentPeriodEnd")
WHERE "status" IN ('ACTIVE', 'TRIALING') AND "cancelAtPeriodEnd" = false;

-- Index for expired subscriptions needing cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_expired"
ON "subscriptions"("currentPeriodEnd", "status")
WHERE "status" IN ('PAST_DUE', 'UNPAID') AND "currentPeriodEnd" < NOW();

-- Index for trial subscriptions (frequent queries for trial status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_trial"
ON "subscriptions"("userId", "trialEnd", "status")
WHERE "trialEnd" IS NOT NULL;

-- ==================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ==================================================

-- Optimize subscription management queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_management"
ON "subscriptions"("stripeSubscriptionId", "status", "userId")
INCLUDE ("tier", "currentPeriodEnd", "cancelAtPeriodEnd");

-- Optimize payment processing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_history_stripe_processing"
ON "paymentHistory"("stripePaymentIntentId", "status")
INCLUDE ("userId", "amount", "createdAt");

-- Optimize webhook duplicate prevention
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_webhook_events_unique_stripe_id"
ON "webhookEvent"("stripeEventId");

-- ==================================================
-- CLEANUP EXPIRED INDEXES (if they exist from old schema)
-- ==================================================

-- Remove any inefficient indexes that might exist
DROP INDEX CONCURRENTLY IF EXISTS "users_email_idx";
DROP INDEX CONCURRENTLY IF EXISTS "subscriptions_user_id_idx";

-- ==================================================
-- QUERY PERFORMANCE ANALYSIS
-- ==================================================

-- Enable query performance tracking in development
-- ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
-- ALTER SYSTEM SET log_statement = 'all';
-- SELECT pg_reload_conf();

-- ==================================================
-- MAINTENANCE TASKS
-- ==================================================

-- Auto-vacuum settings for high-write tables
ALTER TABLE "webhookEvent" SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE "paymentHistory" SET (autovacuum_vacuum_scale_factor = 0.2);
ALTER TABLE "usageRecords" SET (autovacuum_analyze_scale_factor = 0.1);

-- ==================================================
-- PERFORMANCE MONITORING QUERIES
-- ==================================================

-- Monitor slow queries related to subscriptions
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   rows
-- FROM pg_stat_statements 
-- WHERE query ILIKE '%subscription%' 
-- ORDER BY mean_time DESC 
-- LIMIT 10;

-- Monitor index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('users', 'subscriptions', 'paymentHistory', 'webhookEvent')
-- ORDER BY idx_scan DESC;