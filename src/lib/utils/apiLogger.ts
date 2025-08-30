import { NextRequest } from 'next/server';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * API Logger class for structured logging
 */
export class APILogger {
  private static instance: APILogger;
  private isDevelopment: boolean;
  private isProduction: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  public static getInstance(): APILogger {
    if (!APILogger.instance) {
      APILogger.instance = new APILogger();
    }
    return APILogger.instance;
  }

  /**
   * Create a base log entry from request
   */
  private createBaseLogEntry(
    request: NextRequest,
    level: LogLevel,
    message: string
  ): LogEntry {
    const url = new URL(request.url);
    
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      metadata: {}
    };
  }

  /**
   * Get client IP from request headers
   */
  private getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return (request as any).ip || undefined;
  }

  /**
   * Format and output log entry
   */
  private outputLog(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Colorized console output for development
      const colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[37m', // White
      };
      const resetColor = '\x1b[0m';
      const color = colors[entry.level] || colors.debug;

      console.log(
        `${color}[${entry.level.toUpperCase()}]${resetColor} ` +
        `${entry.timestamp} | ${entry.method} ${entry.endpoint} ` +
        `${entry.statusCode ? `| ${entry.statusCode}` : ''} ` +
        `${entry.duration ? `| ${entry.duration}ms` : ''} ` +
        `${entry.userId ? `| User: ${entry.userId}` : ''}`
      );
      
      if (entry.message) {
        console.log(`  Message: ${entry.message}`);
      }
      
      if (entry.error) {
        console.log(`  Error: ${entry.error.message}`);
        if (entry.error.stack && entry.level === LogLevel.ERROR) {
          console.log(`  Stack: ${entry.error.stack}`);
        }
      }
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log(`  Metadata:`, entry.metadata);
      }
    } else {
      // JSON output for production (easier for log aggregation)
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log an error
   */
  public error(
    request: NextRequest,
    message: string,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(request, LogLevel.ERROR, message);
    
    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log a warning
   */
  public warn(
    request: NextRequest,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(request, LogLevel.WARN, message);
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log an info message
   */
  public info(
    request: NextRequest,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(request, LogLevel.INFO, message);
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log a debug message (only in development)
   */
  public debug(
    request: NextRequest,
    message: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const entry = this.createBaseLogEntry(request, LogLevel.DEBUG, message);
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log request start
   */
  public requestStart(
    request: NextRequest,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(request, LogLevel.INFO, 'Request started');
    
    if (userId) {
      entry.userId = userId;
    }
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log request completion
   */
  public requestComplete(
    request: NextRequest,
    statusCode: number,
    duration: number,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const entry = this.createBaseLogEntry(
      request, 
      level, 
      `Request completed with status ${statusCode}`
    );
    
    entry.statusCode = statusCode;
    entry.duration = duration;
    
    if (userId) {
      entry.userId = userId;
    }
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.outputLog(entry);
  }

  /**
   * Log subscription events
   */
  public subscriptionEvent(
    request: NextRequest,
    event: string,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(
      request,
      LogLevel.INFO,
      `Subscription event: ${event}`
    );
    
    entry.userId = userId;
    entry.metadata = {
      ...entry.metadata,
      eventType: 'subscription',
      event,
      ...metadata
    };

    this.outputLog(entry);
  }

  /**
   * Log payment events
   */
  public paymentEvent(
    request: NextRequest,
    event: string,
    userId: string,
    amount?: number,
    currency?: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(
      request,
      LogLevel.INFO,
      `Payment event: ${event}`
    );
    
    entry.userId = userId;
    entry.metadata = {
      ...entry.metadata,
      eventType: 'payment',
      event,
      ...(amount && { amount }),
      ...(currency && { currency }),
      ...metadata
    };

    this.outputLog(entry);
  }

  /**
   * Log usage tracking events
   */
  public usageEvent(
    request: NextRequest,
    feature: string,
    userId: string,
    quantity: number = 1,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createBaseLogEntry(
      request,
      LogLevel.DEBUG,
      `Usage event: ${feature}`
    );
    
    entry.userId = userId;
    entry.metadata = {
      ...entry.metadata,
      eventType: 'usage',
      feature,
      quantity,
      ...metadata
    };

    this.outputLog(entry);
  }

  /**
   * Log security events
   */
  public securityEvent(
    request: NextRequest,
    event: string,
    userId?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high' 
      ? LogLevel.ERROR 
      : severity === 'medium' 
      ? LogLevel.WARN 
      : LogLevel.INFO;

    const entry = this.createBaseLogEntry(
      request,
      level,
      `Security event: ${event}`
    );
    
    if (userId) {
      entry.userId = userId;
    }
    
    entry.metadata = {
      ...entry.metadata,
      eventType: 'security',
      event,
      severity,
      ...metadata
    };

    this.outputLog(entry);
  }
}

// Export singleton instance
export const apiLogger = APILogger.getInstance();

/**
 * Request timing utility
 */
export class RequestTimer {
  private startTime: number;
  private request: NextRequest;
  private userId?: string;
  
  constructor(request: NextRequest, userId?: string) {
    this.request = request;
    this.userId = userId;
    this.startTime = Date.now();
    
    // Log request start
    apiLogger.requestStart(request, userId);
  }
  
  /**
   * Complete the request and log timing
   */
  public complete(statusCode: number, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    apiLogger.requestComplete(
      this.request,
      statusCode,
      duration,
      this.userId,
      metadata
    );
  }
  
  /**
   * Get elapsed time
   */
  public getElapsed(): number {
    return Date.now() - this.startTime;
  }
}