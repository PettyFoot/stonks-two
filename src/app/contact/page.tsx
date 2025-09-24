import { Metadata } from 'next';
import ContactPageComponent from './ContactPageComponent';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata('contact');

export default function ContactPage() {
  return <ContactPageComponent discordInvite={process.env.DISCORD_INV} />;
}