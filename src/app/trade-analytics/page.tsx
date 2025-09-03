import { Metadata } from 'next';
import { generateMetadata as genMetadata } from '@/lib/seo';
import TradeAnalyticsComponent from './TradeAnalyticsComponent';

export const metadata: Metadata = {
  title: 'Trade Analytics Platform | Professional Trading Performance Analysis',
  description: 'Advanced trade analytics platform for professional traders. Real-time trade metrics, performance analysis, and comprehensive trading insights with broker integrations.',
  keywords: ['trade analytics', 'trading analytics', 'trade analysis', 'trade metrics', 'trading performance', 'trade tracking', 'trading insights'],
  openGraph: {
    title: 'Trade Analytics Platform | Trade Voyager Analytics',
    description: 'Professional trade analytics platform with real-time performance tracking and comprehensive trading insights.',
    type: 'website',
    url: 'https://tradevoyageranalytics.com/trade-analytics'
  }
};

export default function TradeAnalyticsPage() {
  return <TradeAnalyticsComponent />;
}