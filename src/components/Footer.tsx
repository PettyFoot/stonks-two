import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--theme-primary)] bg-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-3 mb-4 hover:opacity-80 transition-opacity cursor-pointer">
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Analytics - Trading Analytics Platform Footer Logo" 
                width={64} 
                height={64} 
                className="rounded-lg"
                loading="lazy"
                sizes="64px"
              />
              <span className="text-xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
            </Link>
            <p className="text-gray-600 mb-4 max-w-md">
              Professional trade analytics platform for all traders. 
              Advanced trade analytics, real-time performance tracking, and comprehensive trading insights.
            </p>
            <div className="flex space-x-4">
              <Link href="/demo">
                <Button size="sm" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                  Try Demo
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-[var(--theme-primary-text)] mb-4">Company</h3>
            <nav className="space-y-2">
              <Link href="/about" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                About Us
              </Link>
              <Link href="/contact" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Contact
              </Link>
              <Link href="/demo" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Demo
              </Link>
              <Link href="/login" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Sign In
              </Link>
              <Link href="/blog" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Blog
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-[var(--theme-primary-text)] mb-4">Legal</h3>
            <nav className="space-y-2">
              <Link href="/privacy" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Cookie Policy
              </Link>
              <Link href="/terms" className="block text-gray-600 hover:text-[var(--theme-tertiary)] transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-gray-600 mb-4 md:mb-0">
            © 2025 Trade Voyager Analytics. Built for professional traders.
          </p>
          <p className="text-xs text-gray-500">
            Professional trading analytics platform with bank-level security
          </p>
        </div>
      </div>
    </footer>
  );
}