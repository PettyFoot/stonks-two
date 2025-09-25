import { prisma } from '@/lib/prisma';
import { PositionManager } from '../positionManager';
import { isEmergencyActive } from '../emergencyStop';

/**
 * Base Strategy Class for Single Position Trading Bot
 *
 * All trading strategies must extend this class and implement the required methods.
 * This enforces the single position constraint and provides common functionality.
 */

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  symbolId: string;
  quantity: number;
  confidence: number; // 0-1
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
}

export interface ExitSignal {
  shouldExit: boolean;
  reason: string;
  confidence: number;
}

export interface StrategyConfig {
  name: string;
  description: string;
  parameters: Record<string, any>;
  riskLimits: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
  };
}

export abstract class BaseStrategy {
  protected readonly userId: string;
  protected readonly accountId: string;
  protected readonly userSecret: string;
  protected readonly positionManager: PositionManager;
  protected readonly config: StrategyConfig;
  protected isRunning: boolean = false;

  constructor(
    userId: string,
    accountId: string,
    userSecret: string,
    config: StrategyConfig
  ) {
    this.userId = userId;
    this.accountId = accountId;
    this.userSecret = userSecret;
    this.config = config;
    this.positionManager = new PositionManager(userId, accountId, userSecret);
  }

  /**
   * Abstract methods that each strategy must implement
   */
  abstract analyzeMarket(): Promise<StrategySignal | null>;
  abstract shouldExitPosition(position: any): Promise<ExitSignal>;

  /**
   * Main execution loop - called by the strategy scheduler
   */
  async execute(): Promise<{
    success: boolean;
    action?: string;
    message?: string;
    error?: string;
  }> {
    try {
      // Safety checks
      if (await isEmergencyActive()) {
        return { success: false, error: 'Emergency stop is active' };
      }

      const tradingState = await prisma.tradingState.findUnique({
        where: { userId: this.userId }
      });

      if (!tradingState?.isActive) {
        return { success: false, error: 'Trading bot is not active' };
      }

      this.isRunning = true;

      // Check if we have an open position
      if (tradingState.hasOpenPosition) {
        return await this.handleOpenPosition();
      } else {
        return await this.handleNoPosition();
      }

    } catch (error) {
      console.error(`[STRATEGY_${this.config.name}] Execution error:`, error);
      return { success: false, error: `Strategy execution failed: ${error}` };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Handle case where we have an open position - check exit signals
   */
  private async handleOpenPosition(): Promise<{
    success: boolean;
    action?: string;
    message?: string;
    error?: string;
  }> {
    const position = await this.positionManager.getCurrentPosition();
    if (!position) {
      // Position state is inconsistent, fix it
      await prisma.tradingState.update({
        where: { userId: this.userId },
        data: { hasOpenPosition: false }
      });
      return { success: true, message: 'Fixed inconsistent position state' };
    }

    console.log(`[STRATEGY_${this.config.name}] Checking exit signals for ${position.symbol}`);

    // Update position price first
    await this.positionManager.updatePositionPrice();

    // Check stop loss and take profit
    const stopCheckResult = await this.positionManager.checkStopLossAndTakeProfit();
    if (stopCheckResult.shouldClose) {
      console.log(`[STRATEGY_${this.config.name}] Stop/target triggered: ${stopCheckResult.reason}`);

      const closeResult = await this.positionManager.closePosition(stopCheckResult.reason);
      if (closeResult.success) {
        return {
          success: true,
          action: 'CLOSE',
          message: `Position closed: ${stopCheckResult.reason}`
        };
      } else {
        return { success: false, error: closeResult.error };
      }
    }

    // Check strategy-specific exit signals
    const exitSignal = await this.shouldExitPosition(position);
    if (exitSignal.shouldExit) {
      console.log(`[STRATEGY_${this.config.name}] Strategy exit signal: ${exitSignal.reason}`);

      const closeResult = await this.positionManager.closePosition(
        `Strategy exit: ${exitSignal.reason} (confidence: ${exitSignal.confidence})`
      );

      if (closeResult.success) {
        return {
          success: true,
          action: 'CLOSE',
          message: `Position closed by strategy: ${exitSignal.reason}`
        };
      } else {
        return { success: false, error: closeResult.error };
      }
    }

    return {
      success: true,
      message: `Holding position: ${position.symbol} ${position.side}`
    };
  }

  /**
   * Handle case where we have no position - check entry signals
   */
  private async handleNoPosition(): Promise<{
    success: boolean;
    action?: string;
    message?: string;
    error?: string;
  }> {
    console.log(`[STRATEGY_${this.config.name}] Analyzing market for entry signals`);

    const signal = await this.analyzeMarket();
    if (!signal || signal.action === 'HOLD') {
      return {
        success: true,
        message: signal?.reasoning || 'No entry signal found'
      };
    }

    if (signal.action === 'BUY' || signal.action === 'SELL') {
      // Validate signal
      const validationResult = await this.validateSignal(signal);
      if (!validationResult.valid) {
        return {
          success: true,
          message: `Signal rejected: ${validationResult.reason}`
        };
      }

      console.log(`[STRATEGY_${this.config.name}] Opening ${signal.action} position for ${signal.symbol}`);
      console.log(`[STRATEGY_${this.config.name}] Reasoning: ${signal.reasoning}`);
      console.log(`[STRATEGY_${this.config.name}] Confidence: ${signal.confidence}`);

      const side = signal.action === 'BUY' ? 'LONG' : 'SHORT';
      const openResult = await this.positionManager.openPosition({
        symbol: signal.symbol,
        symbolId: signal.symbolId,
        side,
        quantity: signal.quantity,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        strategy: this.config.name
      });

      if (openResult.success) {
        return {
          success: true,
          action: signal.action,
          message: `Opened ${side} position: ${signal.symbol} x${signal.quantity}`
        };
      } else {
        return { success: false, error: openResult.error };
      }
    }

    return { success: true, message: 'No action taken' };
  }

  /**
   * Validate a trading signal against risk limits
   */
  private async validateSignal(signal: StrategySignal): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check confidence threshold
    if (signal.confidence < 0.7) {
      return { valid: false, reason: 'Low confidence signal' };
    }

    // Check position size limits
    if (signal.quantity > this.config.riskLimits.maxPositionSize) {
      return { valid: false, reason: 'Position size exceeds limit' };
    }

    // Check daily loss limits
    const tradingState = await prisma.tradingState.findUnique({
      where: { userId: this.userId }
    });

    if (tradingState && Math.abs(parseFloat(tradingState.dailyPnL.toString())) > this.config.riskLimits.maxDailyLoss) {
      return { valid: false, reason: 'Daily loss limit exceeded' };
    }

    // Add more validation rules as needed
    return { valid: true };
  }

  /**
   * Get strategy performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    totalTrades: number;
    winRate: number;
    averageProfit: number;
    totalPnL: number;
  }> {
    const tradingState = await prisma.tradingState.findUnique({
      where: { userId: this.userId }
    });

    if (!tradingState) {
      return { totalTrades: 0, winRate: 0, averageProfit: 0, totalPnL: 0 };
    }

    const totalTrades = tradingState.totalTrades;
    const winRate = totalTrades > 0
      ? (tradingState.winningTrades / totalTrades) * 100
      : 0;
    const averageProfit = totalTrades > 0
      ? parseFloat(tradingState.totalPnL.toString()) / totalTrades
      : 0;
    const totalPnL = parseFloat(tradingState.totalPnL.toString());

    return { totalTrades, winRate, averageProfit, totalPnL };
  }

  /**
   * Helper method to log strategy actions
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[STRATEGY_${this.config.name}] [${timestamp}] ${message}`;

    switch (level) {
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}