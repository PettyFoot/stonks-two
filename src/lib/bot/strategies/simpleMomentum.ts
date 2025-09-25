import { BaseStrategy, StrategySignal, ExitSignal, StrategyConfig } from './base';
import { getSnapTradeClient } from '@/lib/snaptrade/client';

/**
 * Simple Momentum Strategy
 *
 * A basic momentum-based trading strategy that:
 * - Looks for stocks breaking above resistance with volume
 * - Uses simple moving averages for trend confirmation
 * - Sets stop loss and take profit based on volatility
 *
 * This is a demonstration strategy - NOT FOR LIVE TRADING without backtesting
 */

interface MomentumParameters {
  symbols: string[]; // List of symbols to watch
  volumeThreshold: number; // Minimum volume multiplier
  priceChangeThreshold: number; // Minimum price change %
  stopLossPercent: number; // Stop loss percentage
  takeProfitPercent: number; // Take profit percentage
  maxPositionSize: number; // Maximum position size
}

export class SimpleMomentumStrategy extends BaseStrategy {
  private parameters: MomentumParameters;

  constructor(userId: string, accountId: string, userSecret: string) {
    const config: StrategyConfig = {
      name: 'Simple Momentum',
      description: 'Basic momentum strategy with volume confirmation',
      parameters: {
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'], // Popular stocks for demo
        volumeThreshold: 1.5, // 50% above average volume
        priceChangeThreshold: 2.0, // 2% price move
        stopLossPercent: 2.0, // 2% stop loss
        takeProfitPercent: 4.0, // 4% take profit
        maxPositionSize: 100
      },
      riskLimits: {
        maxPositionSize: 100,
        maxDailyLoss: 500,
        stopLossPercent: 2.0,
        takeProfitPercent: 4.0
      }
    };

    super(userId, accountId, userSecret, config);
    this.parameters = config.parameters as MomentumParameters;
  }

  /**
   * Analyze market for momentum opportunities
   */
  async analyzeMarket(): Promise<StrategySignal | null> {
    try {
      this.log('Starting momentum analysis');

      // For demo purposes, we'll use a simplified approach
      // In production, you'd want proper market data feeds
      const snapTradeClient = getSnapTradeClient();

      // Get current quotes for watched symbols
      const symbols = this.parameters.symbols.slice(0, 3); // Limit to avoid rate limits

      for (const symbol of symbols) {
        try {
          // In a real implementation, you'd:
          // 1. Get historical price data
          // 2. Calculate technical indicators
          // 3. Check volume patterns
          // 4. Analyze momentum signals

          // For now, we'll create a simple demo signal
          const signal = await this.generateDemoSignal(symbol);
          if (signal) {
            this.log(`Generated signal: ${signal.action} ${signal.symbol} - ${signal.reasoning}`);
            return signal;
          }

        } catch (error) {
          this.log(`Error analyzing ${symbol}: ${error}`, 'error');
          continue;
        }
      }

      this.log('No momentum signals found');
      return null;

    } catch (error) {
      this.log(`Market analysis error: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Check if we should exit current position
   */
  async shouldExitPosition(position: any): Promise<ExitSignal> {
    try {
      this.log(`Checking exit signals for ${position.symbol}`);

      // Calculate current P&L percentage
      if (position.currentPrice && position.entryPrice) {
        const entryPrice = parseFloat(position.entryPrice.toString());
        const currentPrice = parseFloat(position.currentPrice.toString());

        const pnlPercent = position.side === 'LONG'
          ? ((currentPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - currentPrice) / entryPrice) * 100;

        this.log(`Current P&L: ${pnlPercent.toFixed(2)}%`);

        // Check for profit taking beyond normal take profit
        if (pnlPercent > this.parameters.takeProfitPercent * 1.5) {
          return {
            shouldExit: true,
            reason: `Extended profit taking at ${pnlPercent.toFixed(2)}%`,
            confidence: 0.8
          };
        }

        // Check for trend reversal (simplified)
        // In production, you'd check technical indicators
        const timeSinceEntry = Date.now() - new Date(position.openedAt).getTime();
        const hoursOpen = timeSinceEntry / (1000 * 60 * 60);

        // Simple time-based exit if position has been open too long without hitting targets
        if (hoursOpen > 24 && Math.abs(pnlPercent) < 1) {
          return {
            shouldExit: true,
            reason: 'Time-based exit - no momentum after 24 hours',
            confidence: 0.6
          };
        }
      }

      return {
        shouldExit: false,
        reason: 'No exit signal detected',
        confidence: 0
      };

    } catch (error) {
      this.log(`Exit analysis error: ${error}`, 'error');
      return {
        shouldExit: false,
        reason: 'Error in exit analysis',
        confidence: 0
      };
    }
  }

  /**
   * Generate a demo signal (replace with real analysis in production)
   */
  private async generateDemoSignal(symbol: string): Promise<StrategySignal | null> {
    // This is a DEMO implementation - NOT for live trading
    // In production, implement proper technical analysis here

    // Generate random demo signals for testing (very simplified)
    const random = Math.random();

    // Only generate signals 10% of the time to avoid overtrading
    if (random < 0.9) {
      return null;
    }

    // Demo: randomly choose BUY or SELL with bias toward BUY
    const action = random > 0.85 ? 'BUY' : 'SELL';
    const confidence = 0.7 + (Math.random() * 0.2); // 0.7-0.9 confidence

    // Calculate position size based on confidence
    const baseSize = Math.floor(this.parameters.maxPositionSize * confidence);
    const quantity = Math.max(10, Math.min(baseSize, this.parameters.maxPositionSize));

    // For demo, we'll need to get the symbol ID from SnapTrade
    // This is simplified - in production you'd cache symbol mappings
    const symbolId = `demo-${symbol}-id`; // Placeholder

    // Calculate stop loss and take profit levels
    // These would be based on current price and volatility in production
    const demoPrice = 150 + (Math.random() * 100); // Demo price
    const stopLoss = action === 'BUY'
      ? demoPrice * (1 - this.parameters.stopLossPercent / 100)
      : demoPrice * (1 + this.parameters.stopLossPercent / 100);

    const takeProfit = action === 'BUY'
      ? demoPrice * (1 + this.parameters.takeProfitPercent / 100)
      : demoPrice * (1 - this.parameters.takeProfitPercent / 100);

    this.log(`Demo signal generated for ${symbol}: ${action} at confidence ${confidence.toFixed(2)}`);

    return {
      action,
      symbol,
      symbolId,
      quantity,
      confidence,
      stopLoss,
      takeProfit,
      reasoning: `Demo momentum signal: ${symbol} showing ${action} momentum with ${confidence.toFixed(2)} confidence`
    };
  }

  /**
   * Strategy-specific configuration
   */
  getConfiguration() {
    return {
      ...this.config,
      currentParameters: this.parameters
    };
  }

  /**
   * Update strategy parameters
   */
  updateParameters(newParameters: Partial<MomentumParameters>) {
    this.parameters = { ...this.parameters, ...newParameters };
    this.log('Parameters updated');
  }
}