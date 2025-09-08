'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  auth0Id: string;
  createdAt: string;
  updatedAt: string;
  hasStripeCustomer: boolean;
}

interface Subscription {
  tier: string;
  status: string;
  isActive: boolean;
  isTrial: boolean;
  features: Record<string, unknown>;
}

interface Usage {
  totalTrades: number;
  totalPnL: number;
  totalVolume: number;
  tradesThisMonth: number;
  monthlyLimit: number;
  usagePercentage: number;
}

interface Activity {
  firstTradeDate: string | null;
  lastTradeDate: string | null;
  accountAge: number;
  isNewUser: boolean;
}

interface Preferences {
  timezone: string;
  currency: string;
  dateFormat: string;
  notifications: Record<string, boolean>;
}

interface UserProfileData {
  profile: UserProfile;
  subscription: Subscription;
  usage: Usage;
  activity: Activity;
  preferences: Preferences;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/user/profile');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.status}`);
        }

        const profileData = await response.json();
        setData(profileData);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  return { data, loading, error };
}