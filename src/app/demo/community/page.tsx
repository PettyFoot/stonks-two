'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, MessageSquare, TrendingUp, Award, Eye } from 'lucide-react';

export default function DemoCommunity() {
  const mockPosts = [
    {
      id: 1,
      author: 'VoyagerMike23',
      avatar: 'VM',
      time: '2h ago',
      title: 'Tech Stock Breakout Strategy - 73% Win Rate',
      content: 'Sharing my momentum strategy that\'s been working great in this tech rally. Focus on stocks breaking key resistance with volume...',
      likes: 24,
      comments: 8,
      views: 156,
      tags: ['strategy', 'tech', 'momentum'],
      pnl: '+$2,340',
      winRate: '73%'
    },
    {
      id: 2,
      author: 'SwingMaster',
      avatar: 'SM',
      time: '4h ago',
      title: 'Risk Management Lessons from Last Week',
      content: 'Had some tough losses last week but learned valuable lessons about position sizing and stop losses. Here\'s what I changed...',
      likes: 18,
      comments: 12,
      views: 89,
      tags: ['risk-management', 'lessons'],
      pnl: '-$567',
      winRate: '45%'
    },
    {
      id: 3,
      author: 'DayTradeQueen',
      avatar: 'DQ',
      time: '6h ago',
      title: 'Market Analysis: Key Levels to Watch This Week',
      content: 'Breaking down the key support and resistance levels for major indices. Looking for potential reversal zones...',
      likes: 31,
      comments: 15,
      views: 203,
      tags: ['analysis', 'levels', 'indices'],
      pnl: '+$1,890',
      winRate: '68%'
    }
  ];

  const topVoyagers = [
    { name: 'AlphaTrade', pnl: '+$12,450', winRate: '78%', followers: 1234 },
    { name: 'BetaStrategy', pnl: '+$9,870', winRate: '71%', followers: 987 },
    { name: 'GammaFlow', pnl: '+$8,320', winRate: '69%', followers: 756 }
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Community" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Community Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Trading Community</h2>
            <Button className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)/80] text-white">
              Share Strategy
            </Button>
          </div>
          <p className="text-sm text-muted">Connect with traders, share strategies, and learn from the community</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" className="bg-[var(--theme-green)] text-white border-[var(--theme-green)]">
                Latest
              </Button>
              <Button variant="outline" size="sm">
                Trending
              </Button>
              <Button variant="outline" size="sm">
                Following
              </Button>
            </div>

            {mockPosts.map((post) => (
              <Card key={post.id} className="bg-surface border-default hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">{post.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-primary">{post.author}</div>
                        <div className="text-xs text-muted">{post.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        post.pnl.startsWith('+') ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'
                      }`}>
                        {post.pnl}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {post.winRate} WR
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-base font-medium text-primary mt-2">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted leading-relaxed mb-4">{post.content}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {post.likes}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Voyagers */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topVoyagers.map((voyager, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/20 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-muted">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-primary">{voyager.name}</div>
                        <div className="text-xs text-muted">{voyager.followers} followers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[var(--theme-green)]">{voyager.pnl}</div>
                      <div className="text-xs text-muted">{voyager.winRate} WR</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card className="bg-surface border-default">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Community Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Active Voyagers</span>
                  <span className="text-sm font-medium text-primary">2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Strategies Shared</span>
                  <span className="text-sm font-medium text-primary">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Total P&L</span>
                  <span className="text-sm font-medium text-[var(--theme-green)]">+$847,392</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Avg Win Rate</span>
                  <span className="text-sm font-medium text-primary">62.4%</span>
                </div>
              </CardContent>
            </Card>

            {/* Demo Notice */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-blue-800 mb-2">Demo Community</div>
                <div className="text-xs text-blue-600 leading-relaxed">
                  This is a preview of our trading community features. Sign up to connect with real traders and share strategies.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}