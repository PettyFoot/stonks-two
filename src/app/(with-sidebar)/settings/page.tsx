import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';
import SettingsComponent from './SettingsComponent';

// Generate SEO metadata for settings page
export const metadata: Metadata = generateMetadata('dashboard', {
  title: 'Account Settings - Manage Your Profile & Subscription | Trade Voyager Analytics',
  description: 'Manage your account settings, profile information, subscription, billing, and security preferences in Trade Voyager Analytics.',
  keywords: ['account settings', 'profile management', 'subscription settings', 'billing management', 'account security'],
  noIndex: true // Private authenticated page
});

export default function Settings() {
  return <SettingsComponent />;
}