import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';
import DashboardComponent from './DashboardComponent';

export const metadata: Metadata = generateMetadata('dashboard', {
  noIndex: true // Private authenticated page
});

export default function Dashboard() {
  return <DashboardComponent />;
}