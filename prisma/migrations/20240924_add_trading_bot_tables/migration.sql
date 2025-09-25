-- Migration: Add Trading Bot Tables for Single Position Trading
-- This migration adds the required tables for the admin trading bot with single position constraint

-- TradingState: Manages overall bot state per user (enforces single position)
CREATE TABLE "TradingState" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "hasOpenPosition" BOOLEAN NOT NULL DEFAULT false,
  "currentStrategy" TEXT,
  "lastTradeAt" TIMESTAMP(3),
  "totalTrades" INTEGER NOT NULL DEFAULT 0,
  "winningTrades" INTEGER NOT NULL DEFAULT 0,
  "losingTrades" INTEGER NOT NULL DEFAULT 0,
  "totalPnL" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "dailyPnL" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "maxDrawdown" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TradingState_userId_key" UNIQUE ("userId"),
  CONSTRAINT "TradingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- BotPosition: Tracks the single active position (max one per user)
CREATE TABLE "BotPosition" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "universalSymbolId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "side" TEXT NOT NULL, -- 'LONG' or 'SHORT'
  "entryPrice" DECIMAL(10,4) NOT NULL,
  "entryOrderId" TEXT NOT NULL,
  "stopLoss" DECIMAL(10,4),
  "takeProfit" DECIMAL(10,4),
  "currentPrice" DECIMAL(10,4),
  "unrealizedPnL" DECIMAL(10,2),
  "status" TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSING', 'CLOSED', 'EMERGENCY_CLOSED'
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),

  CONSTRAINT "BotPosition_userId_status_key" UNIQUE ("userId", "status"),
  CONSTRAINT "BotPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- BotOrder: Tracks all orders placed by the bot
CREATE TABLE "BotOrder" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "brokerOrderId" TEXT,
  "snapTradeTradeId" TEXT, -- From getOrderImpact
  "universalSymbolId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'BUY' or 'SELL'
  "orderType" TEXT NOT NULL, -- 'Market', 'Limit', 'Stop', 'StopLimit'
  "timeInForce" TEXT NOT NULL, -- 'DAY', 'GTC', 'FOK', 'IOC'
  "quantity" INTEGER NOT NULL,
  "limitPrice" DECIMAL(10,4),
  "stopPrice" DECIMAL(10,4),
  "estimatedCommission" DECIMAL(10,2),
  "estimatedFees" DECIMAL(10,2),
  "actualCommission" DECIMAL(10,2),
  "actualFees" DECIMAL(10,2),
  "fillPrice" DECIMAL(10,4),
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PLACED', 'FILLED', 'CANCELLED', 'REJECTED'
  "cancelReason" TEXT,
  "userSecret" TEXT, -- For SnapTrade API calls
  "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "filledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),

  CONSTRAINT "BotOrder_brokerOrderId_key" UNIQUE ("brokerOrderId"),
  CONSTRAINT "BotOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- EmergencyStop: Logs all emergency stop events
CREATE TABLE "EmergencyStop" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "triggeredBy" TEXT NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL,
  "positionsClosed" INTEGER NOT NULL DEFAULT 0,
  "ordersCancelled" INTEGER NOT NULL DEFAULT 0,
  "totalLoss" DECIMAL(10,2),
  "metadata" JSONB,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,

  CONSTRAINT "EmergencyStop_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- BotStrategy: Configuration for trading strategies
CREATE TABLE "BotStrategy" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL, -- 'momentum', 'mean_reversion', 'scalping', etc.
  "parameters" JSONB NOT NULL,
  "riskLimits" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isEmergencyStopped" BOOLEAN NOT NULL DEFAULT false,
  "maxPositionSize" INTEGER NOT NULL DEFAULT 100,
  "maxDailyLoss" DECIMAL(10,2) DEFAULT 100.00,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BotStrategy_userId_name_key" UNIQUE ("userId", "name"),
  CONSTRAINT "BotStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- MarketAnalysis: AI analysis results for trading decisions
CREATE TABLE "MarketAnalysis" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "strategyId" TEXT,
  "symbol" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "analysisType" TEXT NOT NULL, -- 'technical', 'sentiment', 'combined'
  "signal" TEXT, -- 'STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'
  "confidence" DECIMAL(3,2), -- 0.00 to 1.00
  "indicators" JSONB,
  "recommendation" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketAnalysis_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BotStrategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX "TradingState_isActive_idx" ON "TradingState" ("isActive");
CREATE INDEX "TradingState_hasOpenPosition_idx" ON "TradingState" ("hasOpenPosition");

CREATE INDEX "BotPosition_status_idx" ON "BotPosition" ("status");
CREATE INDEX "BotPosition_userId_status_idx" ON "BotPosition" ("userId", "status");
CREATE INDEX "BotPosition_openedAt_idx" ON "BotPosition" ("openedAt");

CREATE INDEX "BotOrder_status_idx" ON "BotOrder" ("status");
CREATE INDEX "BotOrder_userId_status_idx" ON "BotOrder" ("userId", "status");
CREATE INDEX "BotOrder_symbol_idx" ON "BotOrder" ("symbol");
CREATE INDEX "BotOrder_placedAt_idx" ON "BotOrder" ("placedAt");

CREATE INDEX "EmergencyStop_triggeredAt_idx" ON "EmergencyStop" ("triggeredAt");
CREATE INDEX "EmergencyStop_triggeredBy_idx" ON "EmergencyStop" ("triggeredBy");

CREATE INDEX "BotStrategy_isActive_idx" ON "BotStrategy" ("isActive");
CREATE INDEX "BotStrategy_userId_isActive_idx" ON "BotStrategy" ("userId", "isActive");

CREATE INDEX "MarketAnalysis_symbol_idx" ON "MarketAnalysis" ("symbol");
CREATE INDEX "MarketAnalysis_createdAt_idx" ON "MarketAnalysis" ("createdAt");
CREATE INDEX "MarketAnalysis_expiresAt_idx" ON "MarketAnalysis" ("expiresAt");