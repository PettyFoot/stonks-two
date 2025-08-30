import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  description: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

export interface PaymentSummary {
  totalPaid: number;
  totalTransactions: number;
  lastPayment?: Date;
  nextPayment?: Date;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

interface UsePaymentHistoryReturn {
  payments: PaymentRecord[];
  summary: PaymentSummary | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  downloadInvoice: (paymentId: string) => Promise<void>;
}

/**
 * Hook for managing payment history and billing information
 * Provides paginated payment records, summary statistics, and invoice downloads
 */
export function usePaymentHistory(): UsePaymentHistoryReturn {
  const { user, isLoading: authLoading } = useUser();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  /**
   * Fetch payment history from API
   */
  const fetchPayments = useCallback(async (page: number = 0, append: boolean = false): Promise<void> => {
    if (!user) {
      setPayments([]);
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      if (!append) setIsLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      const response = await fetch(`/api/payments?${params}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setPayments([]);
          setSummary(null);
          return;
        }
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      
      const newPayments: PaymentRecord[] = data.payments.map((payment: any) => ({
        id: payment.id,
        date: payment.createdAt,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description || 'Subscription payment',
        receiptUrl: payment.receiptUrl,
        invoiceUrl: payment.invoiceUrl,
        paymentMethod: payment.paymentMethod
      }));

      if (append) {
        setPayments(prev => [...prev, ...newPayments]);
      } else {
        setPayments(newPayments);
        setSummary(data.summary);
      }

      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment history');
      
      if (!append) {
        setPayments([]);
        setSummary(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Load more payments (pagination)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (hasMore && !isLoading) {
      await fetchPayments(currentPage + 1, true);
    }
  }, [currentPage, hasMore, isLoading, fetchPayments]);

  /**
   * Refresh payment data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchPayments(0, false);
  }, [fetchPayments]);

  /**
   * Download invoice for a specific payment
   */
  const downloadInvoice = useCallback(async (paymentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/payments/invoice/${paymentId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const data = await response.json();
      
      if (data.url) {
        // Open invoice URL in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('Invoice URL not available');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      throw new Error('Failed to download invoice');
    }
  }, []);

  // Fetch payments on mount and when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchPayments();
    }
  }, [authLoading, fetchPayments]);

  return {
    payments,
    summary,
    isLoading: isLoading || authLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    downloadInvoice,
  };
}

/**
 * Helper hook for payment status formatting
 */
export function usePaymentFormatters() {
  const formatAmount = useCallback((amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
  }, []);

  const formatDate = useCallback((date: string): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  }, []);

  const getStatusColor = useCallback((status: PaymentRecord['status']) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'canceled':
        return 'outline';
      default:
        return 'secondary';
    }
  }, []);

  const getStatusText = useCallback((status: PaymentRecord['status']) => {
    switch (status) {
      case 'succeeded':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'canceled':
        return 'Canceled';
      default:
        return 'Unknown';
    }
  }, []);

  const formatPaymentMethod = useCallback((paymentMethod?: PaymentRecord['paymentMethod']) => {
    if (!paymentMethod) return 'Unknown';
    
    const { type, brand, last4 } = paymentMethod;
    
    if (type === 'card' && brand && last4) {
      return `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
    }
    
    return type.charAt(0).toUpperCase() + type.slice(1);
  }, []);

  return {
    formatAmount,
    formatDate,
    getStatusColor,
    getStatusText,
    formatPaymentMethod,
  };
}