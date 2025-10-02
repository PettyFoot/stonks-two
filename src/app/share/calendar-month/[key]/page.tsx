'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, Calendar } from 'lucide-react';
import { TriangleLoader } from '@/components/ui/TriangleLoader';
import SharedCalendarMonth from '@/components/SharedCalendarMonth';

interface DayData {
  day: string;
  tradeCount: number;
  pnl: number;
  winRate: number;
}

interface MonthlyStats {
  monthlyPnl: number;
  tradingDays: number;
  totalTrades: number;
  avgWinRate: number;
}

interface CalendarMonthData {
  type: 'month';
  year: number;
  month: number;
  monthData: DayData[];
  monthlyStats: MonthlyStats;
  trades: any[];
}

interface SharedCalendarMonthData {
  trade: CalendarMonthData;
  orders: any[];
  metadata: {
    isCalendarMonthShare: boolean;
    year: number;
    month: number;
  };
  expiresAt: string;
  createdAt: string;
  isCalendarMonthShare: boolean;
  apiUsage?: {
    used: number;
    remaining: number;
    total: number;
    percentage: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    lastApiCall?: string;
  };
}

export default function SharedCalendarMonthPage() {
  const params = useParams();
  const { key } = params;

  const [data, setData] = useState<SharedCalendarMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSharedCalendar = async () => {
      try {
        const response = await fetch(`/api/share/${key}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load shared calendar');
        }

        const result = await response.json();

        // Validate that this is a calendar month share
        if (!result.isCalendarMonthShare) {
          throw new Error('This link is not for a calendar month view');
        }

        setData(result);
      } catch (error) {
        console.error('Failed to fetch shared calendar:', error);
        setError(error instanceof Error ? error.message : 'Failed to load shared calendar');
      } finally {
        setLoading(false);
      }
    };

    if (key) {
      fetchSharedCalendar();
    }
  }, [key]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeToExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <TriangleLoader size="lg" text="Loading shared calendar..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-gray-900">Unable to Load Calendar</h1>
              <p className="text-gray-600">{error}</p>
            </div>
            {error.includes('expired') && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Shared calendar links expire after 14 days for security purposes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-gray-600">Shared calendar not found</h1>
        </div>
      </div>
    );
  }

  const calendarData = data.trade;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        {/* Centered Logo */}
        <div className="flex justify-center mb-4">
          <Link href="/">
            <Image
              src="/trade-voyager-logo.png"
              alt="Trade Voyager"
              width={80}
              height={27}
              className="object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Calendar: {formatMonthYear(calendarData.year, calendarData.month)}
              </h1>
              <p className="text-sm text-gray-500">
                Shared via <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">Trade Voyager Analytics</Link>
              </p>
            </div>
          </div>

          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <Clock className="h-4 w-4" />
            {getTimeToExpiry(data.expiresAt)}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* API Usage Warning */}
        {data.apiUsage && (
          <>
            {data.apiUsage.level === 'CRITICAL' && data.apiUsage.remaining <= 10 && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  🚨 <strong>Critical:</strong> Only {data.apiUsage.remaining} views remaining before this link expires
                </AlertDescription>
              </Alert>
            )}
            {data.apiUsage.level === 'HIGH' && data.apiUsage.remaining > 10 && data.apiUsage.remaining <= 50 && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  ⚠️ <strong>Warning:</strong> {data.apiUsage.remaining} views remaining for this shared link
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Calendar Component */}
        <SharedCalendarMonth
          year={calendarData.year}
          month={calendarData.month}
          monthData={calendarData.monthData}
          monthlyStats={calendarData.monthlyStats}
          trades={calendarData.trades || []}
        />

        {/* Footer */}
        <div className="py-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-4">
            {/* Text Group - Centered */}
            <div className="text-center">
              <div className="text-sm text-gray-500">
                Powered by <Link href="/" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">Trade Voyager Analytics</Link>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Shared on {formatDate(data.createdAt)} • Expires {formatDate(data.expiresAt)}
              </div>
            </div>
            {/* Logo Group - Right */}
            <div>
              <Image
                src="/trade-voyager-logo.png"
                alt="Trade Voyager"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
