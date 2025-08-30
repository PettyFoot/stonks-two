import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { rateLimit } from '@/lib/utils/rateLimit';

// Types for middleware
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
    auth0Id?: string;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: SubscriptionStatus;
  };
}

export interface MiddlewareConfig {
  requireAuth?: boolean;
  requirePremium?: boolean;
  rateLimit?: {
    max: number;
    windowMs: number;
    message?: string;
  };
  allowDemo?: boolean;
  logRequests?: boolean;
}

/**
 * Authentication middleware
 * Validates user authentication and adds user info to request
 */
export async function withAuth(
  request: NextRequest,
  config: MiddlewareConfig = {}
): Promise<{ user: unknown; error?: NextResponse }> {
  const {
    requireAuth = true,
    requirePremium = false,
    allowDemo = true,
    logRequests = true,
  } = config;

  const startTime = Date.now();

  try {
    // Get current user (supports both Auth0 and demo)
    const user = await getCurrentUser();
    
    if (requireAuth && !user) {
      return {
        user: null,
        error: NextResponse.json(
          { 
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
            message: 'You must be logged in to access this resource'
          },
          { status: 401 }
        )
      };
    }

    if (!user) {
      return { user: null };
    }

    // Check if demo user is allowed
    if (!allowDemo && !user.auth0Id) {
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'Feature not available in demo mode',
            code: 'DEMO_RESTRICTED',
            message: 'This feature is only available to registered users'
          },
          { status: 403 }
        )
      };
    }

    // Get user's subscription information
    let subscriptionTier = SubscriptionTier.FREE;
    let subscriptionStatus = SubscriptionStatus.INACTIVE;

    if (user.auth0Id) { // Only for real users, not demo
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
        }
      });

      if (dbUser) {
        subscriptionTier = dbUser.subscriptionTier;
        subscriptionStatus = dbUser.subscriptionStatus;
      }

      // Check premium requirement
      if (requirePremium && subscriptionTier === SubscriptionTier.FREE) {
        return {
          user: null,
          error: NextResponse.json(
            {
              error: 'Premium subscription required',
              code: 'PREMIUM_REQUIRED',
              message: 'This feature is only available to Premium subscribers',
              upgradeUrl: '/subscription/create'
            },
            { status: 402 } // Payment Required
          )
        };
      }
    }

    const enhancedUser = {
      ...user,
      subscriptionTier,
      subscriptionStatus,
    };

    // Log request if enabled
    if (logRequests && process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE] Request authenticated for user ${user.id} in ${Date.now() - startTime}ms`);
    }

    return { user: enhancedUser };

  } catch (error) {
    console.error('[MIDDLEWARE] Authentication error:', error);
    
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Authentication failed',
          code: 'AUTHENTICATION_ERROR',
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Rate limiting middleware
 */
export async function withRateLimit(
  request: NextRequest,
  config: { max: number; windowMs: number; message?: string; keyGenerator?: (req: NextRequest) => string }
): Promise<{ error?: NextResponse }> {
  const {
    max,
    windowMs,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => getClientIP(req) || 'anonymous'
  } = config;

  try {
    const key = keyGenerator(request);
    const isAllowed = await rateLimit(key, max, windowMs);

    if (!isAllowed) {
      return {
        error: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: Math.ceil(windowMs / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(windowMs / 1000).toString(),
            }
          }
        )
      };
    }

    return {};

  } catch (error) {
    console.error('[MIDDLEWARE] Rate limiting error:', error);
    // Don't fail the request for rate limiting errors
    return {};
  }
}

/**
 * Request validation middleware
 */
export async function withValidation<T>(
  request: NextRequest,
  schema: unknown, // Zod schema
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    let body;
    
    // Only parse body for methods that typically have one
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        body = await request.json();
      } catch (parseError) {
        return {
          error: NextResponse.json(
            {
              error: 'Invalid JSON in request body',
              code: 'INVALID_JSON',
              message: 'Request body must be valid JSON'
            },
            { status: 400 }
          )
        };
      }
    }

    // Validate using provided schema
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return {
        error: NextResponse.json(
          {
            error: 'Invalid request data',
            code: 'VALIDATION_ERROR',
            details: validationResult.error.issues.map((issue: Record<string, unknown>) => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            }))
          },
          { status: 400 }
        )
      };
    }

    return { data: validationResult.data };

  } catch (error) {
    console.error('[MIDDLEWARE] Validation error:', error);
    
    return {
      error: NextResponse.json(
        {
          error: 'Request validation failed',
          code: 'VALIDATION_FAILED',
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Combined middleware wrapper for API routes
 */
export function withMiddleware(config: MiddlewareConfig = {}) {
  return function middleware<T = unknown>(
    handler: (request: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
    validationSchema?: unknown
  ) {
    return async function wrappedHandler(
      request: NextRequest,
      context?: unknown
    ): Promise<NextResponse> {
      const startTime = Date.now();

      try {
        // Apply rate limiting if configured
        if (config.rateLimit) {
          const rateLimitResult = await withRateLimit(request, {
            max: config.rateLimit.max,
            windowMs: config.rateLimit.windowMs,
            message: config.rateLimit.message,
            keyGenerator: (req) => {
              // Use user ID if available, otherwise IP
              return getClientIP(req) || 'anonymous';
            }
          });

          if (rateLimitResult.error) {
            return rateLimitResult.error;
          }
        }

        // Apply authentication
        const authResult = await withAuth(request, config);
        if (authResult.error) {
          return authResult.error;
        }

        // Apply validation if schema provided
        let validatedData;
        if (validationSchema) {
          const validationResult = await withValidation(request, validationSchema);
          if (validationResult.error) {
            return validationResult.error;
          }
          validatedData = validationResult.data;
        }

        // Create enhanced request object
        const enhancedRequest = request as AuthenticatedRequest;
        enhancedRequest.user = authResult.user;

        // Add validated data to request if available
        if (validatedData) {
          (enhancedRequest as Record<string, unknown>).validatedData = validatedData;
        }

        // Log request processing time in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MIDDLEWARE] Request processed in ${Date.now() - startTime}ms`);
        }

        // Call the actual handler
        return await handler(enhancedRequest, context);

      } catch (error) {
        console.error('[MIDDLEWARE] Wrapper error:', error);
        
        return NextResponse.json(
          {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
              details: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            })
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Helper function to get client IP address
 */
function getClientIP(request: NextRequest): string | null {
  // Check various headers for IP address
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

  // Fallback to connection remote address
  return request.ip || null;
}

/**
 * Error handler utility
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'Internal server error',
  statusCode: number = 500
): NextResponse {
  console.error(`[API_ERROR] ${defaultMessage}:`, error);

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      error: defaultMessage,
      code: 'API_ERROR',
      timestamp: new Date().toISOString(),
      ...(isDevelopment && error instanceof Error && {
        details: error.message,
        stack: error.stack,
      })
    },
    { status: statusCode }
  );
}

/**
 * Success response utility
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}