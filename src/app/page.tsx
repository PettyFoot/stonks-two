import { Metadata } from 'next';
import { generateMetadata as genMetadata } from '@/lib/seo';
import LandingPageComponent from './LandingPageComponent';

export const metadata: Metadata = genMetadata('home');

export default function LandingPage() {
  return <LandingPageComponent />;
}
