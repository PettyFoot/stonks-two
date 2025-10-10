/**
 * Security and validation layer for CSV order staging system
 * Prevents malicious input and validates data before processing
 */

export class InputValidator {
  /**
   * Sanitize and validate stock/option symbol
   * Supports:
   * - Standard equity symbols: 1-6 characters (AAPL, MSFT)
   * - Options symbols (OCC format): up to 21 characters (YHOO150416C00030000)
   * - Extended symbols with dots/hyphens: (BRK.B, BF-A)
   */
  static sanitizeSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Symbol is required and must be a string');
    }

    // Valid symbol pattern: 1-21 characters, alphanumeric, dots, hyphens
    // Supports standard equities and options contracts (OCC format)
    const validPattern = /^[A-Z0-9\-\.]{1,21}$/;
    const normalized = symbol.toUpperCase().trim();

    if (!validPattern.test(normalized)) {
      throw new Error(`Invalid symbol format: ${symbol}. Must be 1-21 alphanumeric characters, dots, or hyphens.`);
    }

    return normalized;
  }

  /**
   * Sanitize JSON data to prevent injection attacks
   */
  static sanitizeJsonData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    return JSON.parse(JSON.stringify(data, (key, value) => {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }

      // Limit string length to prevent DoS
      if (typeof value === 'string') {
        if (value.length > 10000) {
          return value.substring(0, 10000);
        }
        // Remove potential SQL/NoSQL injection patterns
        return value.replace(/[\$\{\}]/g, '');
      }

      return value;
    }));
  }

  /**
   * Validate order quantity
   */
  static validateQuantity(quantity: any): number {
    const num = Number(quantity);

    if (!Number.isInteger(num) || num <= 0 || num > 1000000) {
      throw new Error(`Invalid quantity: ${quantity}. Must be a positive integer between 1 and 1,000,000.`);
    }

    return num;
  }

  /**
   * Validate and sanitize price values
   */
  static validatePrice(price: any): number | null {
    if (price === null || price === undefined || price === '') {
      return null;
    }

    const num = Number(price);

    if (isNaN(num) || num < 0 || num > 1000000) {
      throw new Error(`Invalid price: ${price}. Must be a number between 0 and 1,000,000.`);
    }

    return num;
  }

  /**
   * Validate date strings
   */
  static validateDate(dateValue: any): Date {
    if (!dateValue) {
      throw new Error('Date is required');
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateValue}`);
    }

    // Reasonable date range (not before 1990, not more than 1 year in future)
    const minDate = new Date('1990-01-01');
    const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    if (date < minDate || date > maxDate) {
      throw new Error(`Date out of valid range: ${dateValue}. Must be between 1990 and one year from now.`);
    }

    return date;
  }

  /**
   * Validate order side
   */
  static validateSide(side: any): 'BUY' | 'SELL' {
    if (!side || typeof side !== 'string') {
      throw new Error('Order side is required');
    }

    const normalized = side.toUpperCase().trim();
    const validSides = ['BUY', 'SELL', 'BOT', 'SLD', 'B', 'S', 'BOUGHT', 'SOLD', 'YOU BOUGHT', 'YOU SOLD'];

    if (!validSides.includes(normalized)) {
      throw new Error(`Invalid order side: ${side}. Must be one of: BUY, SELL, BOT, SLD, etc.`);
    }

    // Normalize to standard values
    const buyValues = ['BUY', 'BOT', 'B', 'BOUGHT', 'YOU BOUGHT'];
    return buyValues.includes(normalized) ? 'BUY' : 'SELL';
  }

  /**
   * Validate order type
   */
  static validateOrderType(orderType: any): string {
    if (!orderType || typeof orderType !== 'string') {
      return 'MARKET'; // Default fallback
    }

    const normalized = orderType.toUpperCase().trim();
    const validTypes = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'MKT', 'LMT', 'STP'];

    if (!validTypes.includes(normalized)) {
      console.warn(`Unknown order type: ${orderType}, defaulting to MARKET`);
      return 'MARKET';
    }

    // Normalize to standard values
    const typeMap: Record<string, string> = {
      'MKT': 'MARKET',
      'LMT': 'LIMIT',
      'STP': 'STOP'
    };

    return typeMap[normalized] || normalized;
  }

  /**
   * Validate CSV row size and structure
   */
  static validateCsvRow(row: any): void {
    if (!row || typeof row !== 'object') {
      throw new Error('Invalid CSV row: must be an object');
    }

    const keys = Object.keys(row);

    if (keys.length === 0) {
      throw new Error('CSV row cannot be empty');
    }

    if (keys.length > 50) {
      throw new Error('CSV row has too many columns (max 50)');
    }

    // Basic structure validation only - field mapping validation happens later
    // Skip field name requirements since raw CSV files have various field names
  }

  /**
   * Validate account ID format
   */
  static validateAccountId(accountId: any): string | null {
    if (!accountId || accountId === '') {
      return null;
    }

    const str = String(accountId).trim();

    // Basic pattern: alphanumeric with some special characters, max 50 chars
    if (!/^[A-Za-z0-9\-\_\.]{1,50}$/.test(str)) {
      throw new Error(`Invalid account ID format: ${accountId}`);
    }

    return str;
  }

  /**
   * Comprehensive validation for staging order data
   */
  static validateStagingOrderData(data: any): {
    symbol: string;
    quantity: number;
    side: 'BUY' | 'SELL';
    orderType: string;
    orderPlacedTime: Date;
    orderExecutedTime: Date;
    limitPrice?: number | null;
    stopPrice?: number | null;
    accountId?: string | null;
  } {
    const errors: string[] = [];

    try {
      const symbol = this.sanitizeSymbol(data.symbol);
      const quantity = this.validateQuantity(data.quantity || data.orderQuantity);
      const side = this.validateSide(data.side);
      const orderType = this.validateOrderType(data.orderType);
      const orderPlacedTime = this.validateDate(data.orderPlacedTime);
      const orderExecutedTime = this.validateDate(data.orderExecutedTime || data.orderPlacedTime);
      const limitPrice = this.validatePrice(data.limitPrice);
      const stopPrice = this.validatePrice(data.stopPrice);
      const accountId = this.validateAccountId(data.accountId);

      return {
        symbol,
        quantity,
        side,
        orderType,
        orderPlacedTime,
        orderExecutedTime,
        limitPrice,
        stopPrice,
        accountId
      };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push('Unknown validation error');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    throw new Error('Unexpected validation error');
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static rateLimitMap = new Map<string, number[]>();

  /**
   * Check if user has exceeded rate limit
   */
  static checkRateLimit(
    userId: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const userRequests = this.rateLimitMap.get(userId) || [];

    // Filter out old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitMap.set(userId, recentRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup(windowMs * 2);
    }

    return true; // Within rate limit
  }

  /**
   * Cleanup old rate limit entries
   */
  private static cleanup(maxAge: number): void {
    const now = Date.now();

    for (const [userId, requests] of this.rateLimitMap.entries()) {
      const recentRequests = requests.filter(time => now - time < maxAge);

      if (recentRequests.length === 0) {
        this.rateLimitMap.delete(userId);
      } else {
        this.rateLimitMap.set(userId, recentRequests);
      }
    }
  }
}