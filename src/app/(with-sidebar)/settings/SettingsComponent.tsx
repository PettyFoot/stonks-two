'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// Card components imported by tab components
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@prisma/client';
// Using custom separator instead of importing one
import {
  User,
  CreditCard,
  Shield,
  Settings as SettingsIcon,
  Cookie,
  Loader2,
  Mail
} from 'lucide-react';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';

// Import settings tab components
import ProfileTab from './components/ProfileTab';
import SubscriptionTab from './components/SubscriptionTab';
import BillingTab from './components/BillingTab';
import SecurityTab from './components/SecurityTab';
import CookieSettingsTab from './components/CookieSettingsTab';

export default function SettingsComponent() {
  const { user, isLoading } = useAuth();
  const { subscription } = useSubscription();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  // Redirect if not authenticated
  useEffect(() => {
    // Don't redirect if:
    // 1. Still loading authentication
    // 2. User is already authenticated (including demo users)
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading settings..." />
      </div>
    );
  }

  if (!user) return null;

  const subscriptionTier = subscription?.tier || SubscriptionTier.FREE;
  const subscriptionBadge = subscriptionTier === SubscriptionTier.PREMIUM ? 'Premium' : 'Free';

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'subscription',
      label: 'Subscription',
      icon: SettingsIcon,
      description: 'Manage your subscription plan',
      badge: subscriptionBadge
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: CreditCard,
      description: 'Payment methods and history'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Account security and deletion settings'
    },
    {
      id: 'cookies',
      label: 'Privacy',
      icon: Cookie,
      description: 'Manage your cookie and privacy preferences'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Settings"
        showTimeRangeFilters={false}
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-primary">
                  Welcome, {user.name || user.email || 'User'}
                </h1>
                <p className="text-muted-foreground">
                  Manage your account settings
                </p>
              </div>
              <Link 
                href="/contact"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors text-sm font-medium"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </Link>
            </div>
            <div className="h-px bg-border"></div>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Descriptions */}
            <div className="text-center lg:text-left">
              {tabs.map((tab) => (
                activeTab === tab.id && (
                  <p key={tab.id} className="text-sm text-muted-foreground">
                    {tab.description}
                  </p>
                )
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              <TabsContent value="profile" className="space-y-6">
                <ProfileTab />
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6">
                <SubscriptionTab />
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <BillingTab />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <SecurityTab />
              </TabsContent>

              <TabsContent value="cookies" className="space-y-6">
                <CookieSettingsTab />
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}