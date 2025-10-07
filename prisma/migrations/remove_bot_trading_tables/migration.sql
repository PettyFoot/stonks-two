-- Migration: Remove Bot Trading Tables
-- This migration removes all automated/bot trading functionality and tables

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "market_analyses" CASCADE;
DROP TABLE IF EXISTS "bot_strategies" CASCADE;
DROP TABLE IF EXISTS "emergency_stops" CASCADE;
DROP TABLE IF EXISTS "bot_orders" CASCADE;
DROP TABLE IF EXISTS "bot_positions" CASCADE;
DROP TABLE IF EXISTS "trading_states" CASCADE;
