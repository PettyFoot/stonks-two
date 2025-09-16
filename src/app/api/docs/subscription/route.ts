import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/docs/subscription
 * API documentation for subscription management endpoints
 */
export async function GET(request: NextRequest) {
  const documentation = {
    title: 'Subscription Management API',
    version: '1.0.0',
    description: 'Comprehensive API for managing user subscriptions, payments, and premium features',
    baseUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL,
    
    endpoints: {
      // Subscription Management
      '/api/subscription': {
        GET: {
          summary: 'Get user subscription status',
          description: 'Retrieve current subscription information including tier, status, billing details, and feature access',
          authentication: 'required',
          rateLimit: '100 requests per 15 minutes',
          responses: {
            200: {
              description: 'Subscription information retrieved successfully',
              example: {
                subscription: {
                  id: 'sub_123',
                  tier: 'PREMIUM',
                  status: 'ACTIVE',
                  isActive: true,
                  isTrial: false,
                  currentPeriodEnd: '2024-02-01T00:00:00.000Z',
                  cancelAtPeriodEnd: false
                },
                features: {
                  maxTrades: -1,
                  advancedAnalytics: true,
                  dataExport: true,
                  prioritySupport: true
                },
                billing: {
                  amount: 999,
                  currency: 'USD',
                  interval: 'month'
                }
              }
            },
            401: { description: 'Authentication required' },
            500: { description: 'Internal server error' }
          }
        },
        POST: {
          summary: 'Manage subscription actions',
          description: 'Cancel, reactivate, or change subscription plan',
          authentication: 'required',
          rateLimit: '10 requests per 10 minutes',
          body: {
            action: { type: 'string', enum: ['cancel', 'reactivate', 'change-plan'], required: true },
            planId: { type: 'string', description: 'Required for change-plan action' },
            cancelAtPeriodEnd: { type: 'boolean', description: 'For cancel action' },
            metadata: { type: 'object', description: 'Additional metadata' }
          },
          responses: {
            200: { description: 'Action completed successfully' },
            400: { description: 'Invalid request or action failed' },
            404: { description: 'No active subscription found' }
          }
        }
      },

      '/api/subscription/create': {
        GET: {
          summary: 'Get available subscription plans',
          description: 'Retrieve pricing information and available subscription plans',
          authentication: 'required',
          responses: {
            200: {
              description: 'Available plans retrieved successfully',
              example: {
                plans: [
                  {
                    id: 'premium_monthly',
                    name: 'Premium Monthly',
                    price: 999,
                    currency: 'usd',
                    interval: 'month',
                    features: ['Unlimited trades', 'Advanced analytics']
                  }
                ]
              }
            }
          }
        },
        POST: {
          summary: 'Create new subscription',
          description: 'Create Stripe checkout session for new subscription',
          authentication: 'required',
          rateLimit: '5 requests per 10 minutes',
          body: {
            priceId: { type: 'string', required: true },
            successUrl: { type: 'string', format: 'url', required: true },
            cancelUrl: { type: 'string', format: 'url', required: true },
            trialPeriodDays: { type: 'number', min: 0, max: 30 },
            coupon: { type: 'string' }
          },
          responses: {
            201: {
              description: 'Checkout session created successfully',
              example: {
                success: true,
                checkoutUrl: 'https://checkout.stripe.com/...',
                sessionId: 'cs_...'
              }
            },
            409: { description: 'User already has active subscription' }
          }
        }
      },

      '/api/subscription/cancel': {
        GET: {
          summary: 'Get cancellation preview',
          description: 'Preview what will happen when subscription is cancelled',
          authentication: 'required',
          responses: {
            200: {
              description: 'Cancellation preview retrieved',
              example: {
                canCancel: true,
                cancellationOptions: {
                  cancelAtPeriodEnd: {
                    available: true,
                    accessUntil: '2024-02-01T00:00:00.000Z',
                    daysRemaining: 15
                  }
                }
              }
            }
          }
        },
        POST: {
          summary: 'Cancel subscription',
          description: 'Cancel active subscription immediately or at period end',
          authentication: 'required',
          rateLimit: '5 requests per 10 minutes',
          body: {
            immediately: { type: 'boolean', default: false },
            reason: { type: 'string' },
            feedback: { type: 'string', maxLength: 500 }
          },
          responses: {
            200: { description: 'Subscription cancelled successfully' },
            404: { description: 'No active subscription found' }
          }
        }
      },

      '/api/subscription/reactivate': {
        GET: {
          summary: 'Check reactivation eligibility',
          description: 'Check if subscription can be reactivated',
          authentication: 'required',
          responses: {
            200: {
              description: 'Reactivation status retrieved',
              example: {
                canReactivate: true,
                reactivationDetails: {
                  willRestoreAccess: true,
                  accessUntil: '2024-02-01T00:00:00.000Z'
                }
              }
            }
          }
        },
        POST: {
          summary: 'Reactivate subscription',
          description: 'Reactivate a cancelled subscription',
          authentication: 'required',
          rateLimit: '5 requests per 10 minutes',
          responses: {
            200: { description: 'Subscription reactivated successfully' },
            404: { description: 'No subscription found to reactivate' },
            410: { description: 'Subscription has expired' }
          }
        }
      },

      '/api/subscription/change-plan': {
        GET: {
          summary: 'Get plan change options',
          description: 'Get available plan changes and pricing preview',
          authentication: 'required',
          responses: {
            200: {
              description: 'Plan change options retrieved',
              example: {
                canChangePlan: true,
                availablePlans: [
                  {
                    priceId: 'price_yearly',
                    name: 'Premium Yearly',
                    priceDifference: -100,
                    isDowngrade: true
                  }
                ]
              }
            }
          }
        },
        POST: {
          summary: 'Change subscription plan',
          description: 'Change to a different subscription plan',
          authentication: 'required',
          rateLimit: '5 requests per 10 minutes',
          body: {
            newPriceId: { type: 'string', required: true },
            prorationBehavior: { 
              type: 'string', 
              enum: ['create_prorations', 'none', 'always_invoice'],
              default: 'create_prorations'
            }
          },
          responses: {
            200: { description: 'Plan changed successfully' },
            409: { description: 'Already using this plan' }
          }
        }
      },

      // User Profile
      '/api/user/profile': {
        GET: {
          summary: 'Get user profile',
          description: 'Retrieve user profile with subscription and usage information',
          authentication: 'required',
          responses: {
            200: {
              description: 'Profile retrieved successfully',
              example: {
                profile: {
                  id: 'user_123',
                  email: 'user@example.com',
                  name: 'John Doe'
                },
                subscription: {
                  tier: 'PREMIUM',
                  status: 'ACTIVE'
                },
                usage: {
                  totalTrades: 1250,
                  tradesThisMonth: 45,
                  usagePercentage: 0
                }
              }
            }
          }
        },
        PUT: {
          summary: 'Update user profile',
          description: 'Update user profile information',
          authentication: 'required',
          rateLimit: '10 requests per 10 minutes',
          body: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            preferences: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                currency: { type: 'string', length: 3 },
                notifications: { type: 'object' }
              }
            }
          },
          responses: {
            200: { description: 'Profile updated successfully' },
            409: { description: 'Email already in use' }
          }
        }
      },

      // Usage Tracking
      '/api/usage': {
        GET: {
          summary: 'Get usage statistics',
          description: 'Retrieve current usage statistics and limits',
          authentication: 'required',
          queryParameters: {
            period: { 
              type: 'string', 
              enum: ['current_month', 'last_30_days', 'current_year', 'all_time'],
              default: 'current_month'
            },
            feature: { type: 'string' }
          },
          responses: {
            200: {
              description: 'Usage statistics retrieved',
              example: {
                period: 'current_month',
                usage: {
                  trades: {
                    used: 45,
                    limit: 100,
                    percentage: 45,
                    unlimited: false
                  }
                },
                warnings: [
                  {
                    type: 'trade_limit_warning',
                    message: 'Approaching monthly trade limit',
                    severity: 'warning'
                  }
                ]
              }
            }
          }
        },
        POST: {
          summary: 'Track feature usage',
          description: 'Record usage of premium features for rate limiting',
          authentication: 'required',
          body: {
            feature: {
              type: 'string',
              enum: ['trade_import', 'report_generation', 'data_export', 'advanced_analytics'],
              required: true
            },
            quantity: { type: 'number', min: 1, default: 1 }
          },
          responses: {
            201: { description: 'Usage tracked successfully' },
            429: { description: 'Feature limit exceeded' }
          }
        }
      },

      // Payment History
      '/api/payments': {
        GET: {
          summary: 'Get payment history',
          description: 'Retrieve paginated payment history with filtering',
          authentication: 'required',
          queryParameters: {
            page: { type: 'number', min: 1, default: 1 },
            limit: { type: 'number', min: 1, max: 100, default: 20 },
            status: { type: 'string', enum: ['SUCCEEDED', 'PENDING', 'FAILED'] },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' }
          },
          responses: {
            200: {
              description: 'Payment history retrieved',
              example: {
                data: [
                  {
                    id: 'payment_123',
                    amount: 999,
                    currency: 'USD',
                    status: 'SUCCEEDED',
                    date: '2024-01-01T00:00:00.000Z',
                    displayAmount: '$9.99'
                  }
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  totalPages: 5,
                  totalItems: 95
                },
                summary: {
                  totalPaid: 9999,
                  displayTotalPaid: '$99.99'
                }
              }
            }
          }
        },
        POST: {
          summary: 'Get detailed payment info',
          description: 'Get detailed information for a specific payment',
          authentication: 'required',
          body: {
            paymentIntentId: { type: 'string', required: true }
          },
          responses: {
            200: { description: 'Payment details retrieved' },
            404: { description: 'Payment not found' }
          }
        }
      }
    },

    // Common schemas
    schemas: {
      SubscriptionTier: {
        type: 'string',
        enum: ['FREE', 'PREMIUM']
      },
      SubscriptionStatus: {
        type: 'string', 
        enum: ['INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING']
      },
      PaymentStatus: {
        type: 'string',
        enum: ['SUCCEEDED', 'PENDING', 'FAILED', 'CANCELED', 'REFUNDED']
      }
    },

    // Authentication
    authentication: {
      type: 'Auth0 JWT Token',
      description: 'Include JWT token in Authorization header: "Bearer <token>"',
      demoMode: {
        supported: true,
        description: 'Most endpoints support demo mode with temporary session cookies'
      }
    },

    // Rate Limiting
    rateLimiting: {
      description: 'Rate limits are applied per user ID or IP address',
      limits: {
        general: '100 requests per 15 minutes',
        subscription: '10 requests per 10 minutes', 
        payment: '5 requests per 10 minutes',
        auth: '5 requests per 15 minutes'
      },
      headers: {
        'X-RateLimit-Limit': 'Maximum requests allowed',
        'X-RateLimit-Remaining': 'Requests remaining in window',
        'X-RateLimit-Reset': 'Timestamp when limit resets'
      }
    },

    // Error Handling
    errorHandling: {
      standardFormat: {
        error: 'Human readable error message',
        code: 'Machine readable error code',
        details: 'Additional error details (development only)',
        timestamp: 'ISO 8601 timestamp'
      },
      commonErrors: {
        400: 'Bad Request - Invalid input data',
        401: 'Unauthorized - Authentication required',
        402: 'Payment Required - Premium subscription needed',
        403: 'Forbidden - Insufficient permissions',
        404: 'Not Found - Resource not found',
        409: 'Conflict - Resource already exists or in invalid state',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error - Server error occurred'
      }
    },

    // Examples
    examples: {
      createSubscription: {
        description: 'Create a new premium subscription',
        request: {
          method: 'POST',
          url: '/api/subscription/create',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer <jwt_token>'
          },
          body: {
            priceId: 'price_premium_monthly',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            trialPeriodDays: 7
          }
        },
        response: {
          success: true,
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_...',
          sessionId: 'cs_test_...'
        }
      }
    },

    // Support
    support: {
      documentation: 'https://docs.example.com/api',
      contact: 'support@example.com',
      status: 'https://status.example.com'
    }
  };

  return NextResponse.json(documentation, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  });
}

// Only allow GET method
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}