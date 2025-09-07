'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentHistory, usePaymentFormatters, type PaymentRecord } from '@/hooks/usePaymentHistory';
import { 
  Download, 
  CreditCard, 
  Calendar, 
  DollarSign,
  ExternalLink,
  AlertCircle,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';
import { cn } from '@/lib/utils';

interface PaymentHistoryProps {
  className?: string;
  showSummary?: boolean;
  compact?: boolean;
}

export function PaymentHistory({ 
  className, 
  showSummary = true,
  compact = false 
}: PaymentHistoryProps) {
  const {
    payments,
    summary,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    downloadInvoice
  } = usePaymentHistory();

  const {
    formatAmount,
    formatDate,
    getStatusColor,
    getStatusText,
    formatPaymentMethod
  } = usePaymentFormatters();

  const [downloadingInvoice, setDownloadingInvoice] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const handleDownloadInvoice = async (paymentId: string) => {
    setDownloadingInvoice(paymentId);
    try {
      await downloadInvoice(paymentId);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  if (isLoading && payments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>View your billing and payment records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && payments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load payment history</p>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>View your billing and payment records</CardDescription>
          </div>
          <Button onClick={refresh} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showSummary && summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Paid</span>
              </div>
              <p className="text-2xl font-bold">
                {formatAmount(summary.totalPaid, 'USD')}
              </p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalTransactions}</p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Payment Method</span>
              </div>
              <p className="text-sm font-medium">
                {formatPaymentMethod(summary.paymentMethod)}
              </p>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No payment history</h3>
            <p className="text-sm text-muted-foreground">
              Your payment transactions will appear here once you make a purchase
            </p>
          </div>
        ) : compact ? (
          <div className="space-y-3">
            {payments.map((payment) => (
              <PaymentCompactRow
                key={payment.id}
                payment={payment}
                formatAmount={formatAmount}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                onDownloadInvoice={handleDownloadInvoice}
                downloadingInvoice={downloadingInvoice}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <PaymentTableRow
                    key={payment.id}
                    payment={payment}
                    formatAmount={formatAmount}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    formatPaymentMethod={formatPaymentMethod}
                    onDownloadInvoice={handleDownloadInvoice}
                    downloadingInvoice={downloadingInvoice}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              variant="outline"
            >
              {loadingMore ? (
                <>
                  <InlineTriangleLoader size="sm" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentRowProps {
  payment: PaymentRecord;
  formatAmount: (amount: number, currency: string) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status: PaymentRecord['status']) => string;
  getStatusText: (status: PaymentRecord['status']) => string;
  formatPaymentMethod?: (paymentMethod?: PaymentRecord['paymentMethod']) => string;
  onDownloadInvoice: (paymentId: string) => void;
  downloadingInvoice: string | null;
}

function PaymentTableRow({
  payment,
  formatAmount,
  formatDate,
  getStatusColor,
  getStatusText,
  formatPaymentMethod,
  onDownloadInvoice,
  downloadingInvoice
}: PaymentRowProps) {
  const isDownloading = downloadingInvoice === payment.id;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">
          {formatDate(payment.date)}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="max-w-xs">
          <p className="font-medium truncate">{payment.description}</p>
          {payment.id && (
            <p className="text-xs text-muted-foreground">ID: {payment.id.slice(-8)}</p>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {formatAmount(payment.amount, payment.currency)}
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant={getStatusColor(payment.status) as "default" | "destructive" | "outline" | "secondary"}>
          {getStatusText(payment.status)}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="text-sm">
          {formatPaymentMethod ? formatPaymentMethod(payment.paymentMethod) : 'Card'}
        </div>
      </TableCell>
      
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {payment.receiptUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          
          {payment.invoiceUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownloadInvoice(payment.id)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <InlineTriangleLoader size="sm" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function PaymentCompactRow({
  payment,
  formatAmount,
  formatDate,
  getStatusColor,
  getStatusText,
  onDownloadInvoice,
  downloadingInvoice
}: Omit<PaymentRowProps, 'formatPaymentMethod'>) {
  const isDownloading = downloadingInvoice === payment.id;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate">{payment.description}</p>
          <Badge variant={getStatusColor(payment.status) as "default" | "destructive" | "outline" | "secondary"} className="shrink-0">
            {getStatusText(payment.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(payment.date)}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-medium">
            {formatAmount(payment.amount, payment.currency)}
          </p>
        </div>
        
        {(payment.receiptUrl || payment.invoiceUrl) && (
          <div className="flex gap-1">
            {payment.receiptUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            
            {payment.invoiceUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownloadInvoice(payment.id)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <InlineTriangleLoader size="sm" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}