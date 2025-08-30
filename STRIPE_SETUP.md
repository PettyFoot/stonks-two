# Stripe Integration Setup Guide

This guide covers the complete setup of Stripe subscription billing for the StonksTwo trading platform.

## Overview

The integration provides:
- Premium subscription at $9.99/month with 14-day free trial
- Secure payment processing with Stripe
- Webhook handling for subscription events
- Customer portal for billing management
- Feature restrictions based on subscription tier

## Prerequisites

1. **Stripe Account**: Create a Stripe account at https://dashboard.stripe.com
2. **Webhook Endpoint**: Configure webhook endpoint in Stripe Dashboard
3. **Environment Variables**: Set up required environment variables
4. **Database Migration**: Run Prisma migration to add subscription tables

## Step 1: Stripe Dashboard Setup

### 1.1 Create Products and Prices

1. Go to Stripe Dashboard > Products
2. Create a new product:
   - Name: "StonksTwo Premium"
   - Description: "Premium trading analytics and unlimited features"
3. Add a recurring price:
   - Price: $9.99
   - Billing period: Monthly
   - Currency: USD
4. Copy the Price ID (starts with `price_`) - you'll need this for `STRIPE_PREMIUM_PRICE_ID`

### 1.2 Configure Webhooks

1. Go to Stripe Dashboard > Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select these events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.created`
   - `customer.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)

### 1.3 Get API Keys

1. Go to Stripe Dashboard > API keys
2. Copy the Publishable key (starts with `pk_`)
3. Copy the Secret key (starts with `sk_`)

## Step 2: Environment Variables

Add these variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 3: Database Migration

The Prisma schema has been updated with subscription tables. Run the migration:

```bash
npx prisma db push
```

This will create the following tables:
- `subscriptions` - User subscription data
- `payment_history` - Payment transaction records
- `webhook_events` - Webhook event processing log

## Step 4: Testing the Integration

### 4.1 Test Cards

Use Stripe's test cards for testing:
- **Successful payment**: 4242 4242 4242 4242
- **Declined payment**: 4000 0000 0000 0002
- **Requires authentication**: 4000 0025 0000 3155

### 4.2 Testing Webhooks

1. Use Stripe CLI to forward webhooks to localhost:
   ```bash
   stripe listen --forward-to localhost:3002/api/stripe/webhook
   ```
2. Test subscription creation, updates, and cancellations

## Step 5: Production Deployment

### 5.1 Update Environment Variables

Replace test keys with live keys:
- Use `pk_live_` and `sk_live_` keys
- Update webhook endpoint to production URL
- Update `STRIPE_PREMIUM_PRICE_ID` with live price ID

### 5.2 Security Considerations

- Never expose secret keys in client-side code
- Validate webhook signatures
- Use HTTPS for all endpoints
- Monitor webhook event processing
- Set up proper logging and error tracking

## Usage Examples

### Basic Usage in Components

```typescript
import { useSubscription, PremiumGate } from '@/components/subscription';

function MyComponent() {
  const { hasPremiumAccess, createCheckoutSession } = useSubscription();

  const handleUpgrade = async () => {
    const result = await createCheckoutSession();
    if (result.url) {
      window.location.href = result.url;
    }
  };

  return (
    <PremiumGate feature="advanced analytics">
      <AdvancedAnalytics />
    </PremiumGate>
  );
}
```

### Subscription Management

```typescript
import { SubscriptionCard } from '@/components/subscription';

function SettingsPage() {
  return (
    <div>
      <h1>Account Settings</h1>
      <SubscriptionCard 
        showUpgradeButton={true}
        showManagementButtons={true}
      />
    </div>
  );
}
```

### Checking Permissions

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function ImportPage() {
  const { permissions } = useSubscription();

  if (!permissions.canImportTrades) {
    return <UpgradePrompt feature="trade imports" />;
  }

  return <TradeImportComponent />;
}
```

## API Endpoints

The integration provides these API endpoints:

- `POST /api/stripe/checkout` - Create checkout session
- `GET /api/stripe/subscription` - Get subscription info
- `POST /api/stripe/subscription` - Manage subscription (cancel/reactivate)
- `POST /api/stripe/billing-portal` - Create billing portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## Architecture Overview

### Service Layer Structure

```
src/lib/stripe/
├── config.ts           # Stripe configuration and initialization
├── types.ts            # TypeScript type definitions
├── errorHandler.ts     # Error handling utilities
├── customerService.ts  # Customer management
├── subscriptionService.ts # Subscription management
├── paymentService.ts   # Payment processing
├── webhookService.ts   # Webhook event handling
├── utils.ts           # Utility functions
└── index.ts           # Main exports
```

### Database Schema

The subscription system uses these main models:
- `User` - Extended with subscription fields
- `Subscription` - Subscription records
- `PaymentHistory` - Payment transaction log
- `WebhookEvent` - Webhook processing log

### Component Structure

```
src/components/subscription/
├── SubscriptionCard.tsx  # Main subscription management UI
├── PremiumGate.tsx      # Feature restriction component
└── index.ts             # Component exports
```

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Subscription Metrics**
   - New subscriptions per month
   - Churn rate
   - Trial conversion rate
   - Revenue metrics

2. **Technical Metrics**
   - Webhook processing success rate
   - API response times
   - Payment success/failure rates
   - Error rates

### Regular Maintenance Tasks

1. **Monthly**
   - Review subscription analytics
   - Check webhook processing logs
   - Monitor failed payments
   - Update pricing if needed

2. **Quarterly**
   - Review and optimize subscription flows
   - Update Stripe integration if needed
   - Analyze user feedback on billing

## Troubleshooting

### Common Issues

1. **Webhook Events Not Processing**
   - Check webhook endpoint configuration
   - Verify webhook signature validation
   - Check webhook event logs in Stripe Dashboard

2. **Subscription Status Out of Sync**
   - Use the sync methods to update from Stripe
   - Check webhook processing logs
   - Verify database consistency

3. **Payment Failures**
   - Check Stripe logs for decline reasons
   - Verify card details and billing information
   - Implement retry logic for temporary failures

### Debug Commands

```bash
# Check Prisma schema
npx prisma studio

# View webhook events
stripe events list

# Test webhook endpoint
stripe webhooks test --endpoint-url https://yourdomain.com/api/stripe/webhook
```

## Support and Documentation

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

For additional help, consult the Stripe Dashboard logs and the Next.js application logs for detailed error information.