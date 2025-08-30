'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  context?: string; // e.g., 'subscription', 'payment', 'dashboard'
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo, this.props.context);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          context={this.props.context}
          showErrorDetails={this.props.showErrorDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  context?: string;
  showErrorDetails?: boolean;
}

function ErrorFallbackUI({ 
  error, 
  errorInfo, 
  onReset, 
  context,
  showErrorDetails = process.env.NODE_ENV === 'development'
}: ErrorFallbackProps) {
  const router = useRouter();

  const getContextualMessage = () => {
    switch (context) {
      case 'subscription':
        return {
          title: 'Subscription Error',
          message: 'There was an issue loading your subscription information. This might be a temporary problem.',
          suggestion: 'Try refreshing the page or check back in a few minutes.'
        };
      case 'payment':
        return {
          title: 'Payment Error',
          message: 'There was an issue processing your payment information.',
          suggestion: 'Please try again or contact support if the problem persists.'
        };
      case 'dashboard':
        return {
          title: 'Dashboard Error',
          message: 'Unable to load dashboard data at this time.',
          suggestion: 'Try refreshing the page or navigate to a different section.'
        };
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred while loading this section.',
          suggestion: 'Please try refreshing the page or contact support if the issue continues.'
        };
    }
  };

  const { title, message, suggestion } = getContextualMessage();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {message}
            </p>
            <p className="text-xs text-gray-500">
              {suggestion}
            </p>
          </div>

          {showErrorDetails && error && (
            <details className="mt-4 p-3 bg-gray-50 rounded border text-xs">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Technical Details
              </summary>
              <div className="space-y-2 text-gray-600">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 text-xs overflow-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper component for easier use
export default function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

// Specialized error boundaries for different contexts
export function SubscriptionErrorBoundary({ children, onError }: { 
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary 
      context="subscription" 
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

export function PaymentErrorBoundary({ children, onError }: { 
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary 
      context="payment" 
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

export function DashboardErrorBoundary({ children, onError }: { 
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary 
      context="dashboard" 
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}