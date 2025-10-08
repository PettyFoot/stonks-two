'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  LineChart,
  Activity,
  Users,
  Eye,
  TrendingUp,
  ExternalLink,
  Clock,
  UserCheck,
  UserX,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    totalPageViews: number;
    anonymousSessions: number;
    authenticatedSessions: number;
    recentSessions: number;
    avgSessionDurationMs: number;
  };
  utmSources: Array<{ source: string; count: number }>;
  reddit: {
    totalSessions: number;
    byCampaign: Array<{ utmCampaign: string | null; _count: { sessionId: number } }>;
    byMedium: Array<{ utmMedium: string | null; _count: { sessionId: number } }>;
    byContent: Array<{ utmContent: string | null; _count: { sessionId: number } }>;
    conversions: number;
    conversionRate: number;
  };
  topLandingPages: Array<{ page: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  recentActivity: Array<{
    sessionId: string;
    userId: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    landingPage: string;
    referrer: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    pageViews: number;
    journey: string;
    duration: number;
  }>;
  timeSeries: {
    dailySessions: Array<{ date: string; count: number }>;
    dailyPageViews: Array<{ date: string; count: number }>;
  };
  journeyPaths: Array<{ path: string; count: number }>;
}

export default function AnalyticsPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchAnalytics();
    }
  }, [isAdmin, isLoading, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!isAdmin || !data) return null;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Analytics Dashboard" showTimeRangeFilters={false} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track visitor behavior, UTM campaigns, and user journeys
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange(7)}
                className={`px-3 py-1 rounded ${timeRange === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                7 days
              </button>
              <button
                onClick={() => setTimeRange(30)}
                className={`px-3 py-1 rounded ${timeRange === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                30 days
              </button>
              <button
                onClick={() => setTimeRange(90)}
                className={`px-3 py-1 rounded ${timeRange === 90 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                90 days
              </button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.totalSessions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.overview.recentSessions} in last {timeRange} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.totalPageViews}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.overview.totalSessions > 0 ? (data.overview.totalPageViews / data.overview.totalSessions).toFixed(1) : 0} pages per session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(data.overview.avgSessionDurationMs)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average time on site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitor Type</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <UserX className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{data.overview.anonymousSessions}</span>
                  </div>
                  <span className="text-gray-400">|</span>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{data.overview.authenticatedSessions}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Anonymous vs Authenticated
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reddit Performance */}
          {data.reddit.totalSessions > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  Reddit Ad Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600">Total Sessions</div>
                    <div className="text-2xl font-bold text-orange-600">{data.reddit.totalSessions}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">Conversions</div>
                    <div className="text-2xl font-bold text-green-600">{data.reddit.conversions}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                    <div className="text-2xl font-bold text-blue-600">{data.reddit.conversionRate.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* By Campaign */}
                  {data.reddit.byCampaign.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">By Campaign</h4>
                      <div className="space-y-1">
                        {data.reddit.byCampaign.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.utmCampaign || 'N/A'}</span>
                            <span className="font-medium">{item._count.sessionId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Medium */}
                  {data.reddit.byMedium.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">By Medium</h4>
                      <div className="space-y-1">
                        {data.reddit.byMedium.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.utmMedium || 'N/A'}</span>
                            <span className="font-medium">{item._count.sessionId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Content */}
                  {data.reddit.byContent.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">By Content</h4>
                      <div className="space-y-1">
                        {data.reddit.byContent.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.utmContent || 'N/A'}</span>
                            <span className="font-medium">{item._count.sessionId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Traffic Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-blue-600" />
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.utmSources.slice(0, 10).map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-sm font-medium">{source.source}</div>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{
                              width: `${(source.count / data.overview.totalSessions) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-bold ml-2">{source.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-purple-600" />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.referrers.slice(0, 10).map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 truncate flex-1">
                        {ref.referrer === 'Direct' ? 'Direct Traffic' : new URL(ref.referrer.startsWith('http') ? ref.referrer : `https://${ref.referrer}`).hostname}
                      </div>
                      <div className="text-sm font-bold ml-2">{ref.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Landing Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topLandingPages.map((page, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 truncate flex-1">{page.page}</div>
                      <div className="text-sm font-bold ml-2">{page.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Viewed Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topPages.map((page, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 truncate flex-1">{page.page}</div>
                      <div className="text-sm font-bold ml-2">{page.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Journey Paths */}
          {data.journeyPaths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Common User Journeys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.journeyPaths.slice(0, 10).map((journey, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">{journey.count}</Badge>
                      <div className="text-sm text-gray-700 flex-1">{journey.path}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Source</th>
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Landing Page</th>
                      <th className="text-left p-2">Pages</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-left p-2">Journey</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((session, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 whitespace-nowrap">
                          {format(new Date(session.firstSeenAt), 'MMM dd, HH:mm')}
                        </td>
                        <td className="p-2">
                          {session.userId ? (
                            <Badge variant="default" className="text-xs">User</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Anon</Badge>
                          )}
                        </td>
                        <td className="p-2">{session.utmSource || 'Direct'}</td>
                        <td className="p-2">{session.utmCampaign || '-'}</td>
                        <td className="p-2 truncate max-w-[200px]" title={session.landingPage}>
                          {session.landingPage}
                        </td>
                        <td className="p-2 text-center">{session.pageViews}</td>
                        <td className="p-2">{formatDuration(session.duration)}</td>
                        <td className="p-2 truncate max-w-[300px]" title={session.journey}>
                          {session.journey || 'Single page'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
