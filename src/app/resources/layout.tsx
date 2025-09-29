import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Trading Resources & Guides | Professional Trading Education',
  description: 'Free trading resources, guides, and educational content. Learn trading strategies, risk management, and market analysis from professional traders.',
  keywords: 'trading guides, trading education, trading resources, trading strategies, day trading tips, swing trading, options trading',
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="resources-layout">
      {children}
    </div>
  );
}