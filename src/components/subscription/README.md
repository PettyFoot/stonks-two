# Subscription Components

A comprehensive collection of React components for managing premium subscriptions in a Next.js application. Built with TypeScript, TailwindCSS, and integrated with Stripe for payment processing.

## Components Overview

### Core Components

#### `SubscriptionCard`
The main subscription management component that displays current subscription status, pricing, and provides upgrade/management actions.

```tsx
import { SubscriptionCard } from '@/components/subscription';

<SubscriptionCard 
  showUpgradeButton={true}
  showManagementButtons={true}
  compact={false}
/>
```

#### `PremiumGate`
A wrapper component that restricts content to premium users and shows upgrade prompts to free users.

```tsx
import { PremiumGate, withPremiumGate } from '@/components/subscription';

// As a wrapper component
<PremiumGate feature="advanced analytics">
  <AdvancedAnalytics />
</PremiumGate>

// As a HOC
const PremiumAnalytics = withPremiumGate(AdvancedAnalytics, {
  feature: 'advanced analytics'
});
```

#### `SubscriptionStatus`
Displays the current subscription status with visual indicators, progress bars for trials, and renewal information.

```tsx
import { SubscriptionStatus } from '@/components/subscription';

<SubscriptionStatus 
  showProgress={true}
  showDetails={true}
  compact={false}
/>
```

#### `PricingCard` / `PricingCards`
Displays pricing plans with features, current plan indication, and upgrade functionality.

```tsx
import { PricingCards } from '@/components/subscription';

<PricingCards 
  onUpgrade={handleUpgrade}
  className="max-w-4xl mx-auto"
/>
```

#### `UpgradePrompt`
Flexible upgrade prompt component with multiple variants for different contexts.

```tsx
import { 
  UpgradePrompt, 
  FeatureUpgradePrompt,
  QuickUpgradeBanner,
  InlineUpgradePrompt 
} from '@/components/subscription';

// Card variant (default)
<UpgradePrompt 
  title="Upgrade to Premium"
  feature="unlimited imports"
  variant="card"
/>

// Banner variant
<QuickUpgradeBanner />

// Inline variant
<InlineUpgradePrompt feature="data export" />
```

#### `SubscriptionManagement`
Complete subscription management interface with tabs for overview, billing, and actions.

```tsx
import { SubscriptionManagement } from '@/components/subscription';

<SubscriptionManagement className="max-w-4xl mx-auto" />
```

#### `PaymentHistory`
Displays payment history with summary statistics, receipt downloads, and pagination.

```tsx
import { PaymentHistory } from '@/components/subscription';

<PaymentHistory 
  showSummary={true}
  compact={false}
/>
```

#### `UsageMetrics`
Shows current usage against limits with progress indicators and upgrade prompts when nearing limits.

```tsx
import { UsageMetrics } from '@/components/subscription';

<UsageMetrics 
  showUpgradePrompt={true}
  compact={false}
/>
```

### Utility Components

#### `SubscriptionBadge`
Small badge component showing subscription status with various display options.

```tsx
import { 
  SubscriptionBadge,
  PremiumBadge,
  TrialBadge 
} from '@/components/subscription';

<SubscriptionBadge variant="detailed" showIcon={true} />
<PremiumBadge />
<TrialBadge />
```

## Hooks

### `useSubscription`
Main hook for subscription state management and actions.

```tsx
import { useSubscription } from '@/components/subscription';

const {
  subscription,
  hasPremiumAccess,
  isLoading,
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription
} = useSubscription();
```

### `usePaymentHistory`
Hook for managing payment history and billing information.

```tsx
import { usePaymentHistory, usePaymentFormatters } from '@/components/subscription';

const {
  payments,
  summary,
  loadMore,
  downloadInvoice
} = usePaymentHistory();

const {
  formatAmount,
  formatDate,
  getStatusColor
} = usePaymentFormatters();
```

### `useUsageMetrics`
Hook for tracking usage metrics and limits.

```tsx
import { useUsageMetrics, useUsageFormatters } from '@/components/subscription';

const {
  metrics,
  summary,
  isNearLimit,
  getHighestUsageMetric
} = useUsageMetrics();

const {
  formatUsage,
  getUsageColor,
  getUsageStatusText
} = useUsageFormatters();
```

## Features

### Accessibility
- All components include proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management for modal and interactive elements

### Responsive Design
- Mobile-first approach with responsive grid layouts
- Touch-friendly interactive elements
- Adaptive spacing and typography

### Error Handling
- Graceful fallbacks for API errors
- Loading states for all async operations
- User-friendly error messages

### TypeScript Support
- Full type safety with TypeScript interfaces
- Proper generic types for extensibility
- Exported types for external usage

## Usage Patterns

### Basic Setup
```tsx
// In your app component
import { SubscriptionCard, PremiumGate } from '@/components/subscription';

function Dashboard() {
  return (
    <div className="space-y-6">
      <SubscriptionCard />
      
      <PremiumGate feature="advanced features">
        <AdvancedDashboard />
      </PremiumGate>
    </div>
  );
}
```

### Settings Page
```tsx
import { 
  SubscriptionManagement,
  PaymentHistory,
  UsageMetrics 
} from '@/components/subscription';

function SettingsPage() {
  return (
    <div className="space-y-8">
      <SubscriptionManagement />
      <UsageMetrics />
      <PaymentHistory />
    </div>
  );
}
```

### Pricing Page
```tsx
import { PricingCards } from '@/components/subscription';

function PricingPage() {
  return (
    <div className="py-12">
      <PricingCards className="max-w-6xl mx-auto" />
    </div>
  );
}
```

## Customization

### Styling
Components use Tailwind CSS classes and can be customized through:
- `className` prop for additional styling
- CSS custom properties for theme colors
- Component variants for different use cases

### Theming
Components automatically adapt to your app's theme through:
- TailwindCSS design tokens
- Dark mode support
- Custom color schemes

## Integration Requirements

### Prerequisites
- Next.js 13+ with App Router
- React 18+
- TypeScript
- TailwindCSS
- Auth0 for authentication
- Stripe for payment processing

### API Endpoints
Components expect these API endpoints:
- `/api/stripe/subscription` - Subscription management
- `/api/stripe/checkout` - Checkout session creation
- `/api/stripe/billing-portal` - Billing portal access
- `/api/stripe/payments` - Payment history
- `/api/usage/metrics` - Usage metrics

### Environment Variables
```bash
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Best Practices

1. **Progressive Enhancement**: Use PremiumGate to wrap premium features instead of conditional rendering
2. **Error Boundaries**: Wrap subscription components in error boundaries for better UX
3. **Loading States**: Always show loading indicators during async operations
4. **Accessibility**: Test with screen readers and keyboard navigation
5. **Performance**: Use React.memo for expensive components and proper dependencies in hooks

## Troubleshooting

### Common Issues

**Components not loading subscription data**
- Check Auth0 authentication setup
- Verify API endpoints are implemented
- Check network requests in developer tools

**Stripe integration not working**
- Verify environment variables are set
- Check Stripe webhook configuration
- Ensure proper CORS setup for API routes

**TypeScript errors**
- Install required type packages: `@types/node`, `@prisma/client`
- Check that all imported types are available