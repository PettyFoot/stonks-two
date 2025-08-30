import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';
import LoginPageComponent from './LoginPageComponent';

export const metadata: Metadata = generateMetadata('login');

export default function LoginPage() {
  return <LoginPageComponent />;
}