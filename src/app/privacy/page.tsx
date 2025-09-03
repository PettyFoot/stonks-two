import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy - Trade Voyager Analytics',
  description: 'Trade Voyager Analytics privacy policy covering data collection, usage, and protection for our trading analytics platform.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
          </Link>
          <Link href="/">
            <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8">
            <h1 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-8">Privacy Policy</h1>
            <p className="text-sm text-gray-600 mb-8">Last updated: January 1, 2025</p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed">
                  Trade Voyager Analytics ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our professional trading analytics platform. We understand that your trading data is sensitive and valuable, and we take its protection seriously.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">2. Information We Collect</h2>
                <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Trading Data</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We collect and process your trading data to provide analytics and performance tracking services. This includes:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                  <li>Trade records (symbols, quantities, prices, dates, P&L)</li>
                  <li>Portfolio performance metrics</li>
                  <li>Risk management data</li>
                  <li>Broker integration data (when you choose to connect supported brokers)</li>
                </ul>

                <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Account Information</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use Auth0 for secure authentication and collect basic profile information including your email address and name for account management purposes.
                </p>

                <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Usage Analytics</h3>
                <p className="text-gray-700 leading-relaxed">
                  We collect anonymized usage data to improve our platform, including page views, feature usage, and performance metrics through Vercel Analytics.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-700 leading-relaxed mb-4">We use your information to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Provide trading analytics and performance tracking services</li>
                  <li>Generate reports and insights about your trading performance</li>
                  <li>Manage your account and subscription billing through Stripe</li>
                  <li>Improve our platform and develop new features</li>
                  <li>Provide customer support and respond to your inquiries</li>
                  <li>Comply with legal obligations and protect against fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">4. Data Security and Isolation</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We implement bank-level security measures to protect your trading data:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Complete user data isolation - your trading data is never mixed with other users</li>
                  <li>Encryption in transit and at rest using industry-standard protocols</li>
                  <li>Secure database hosting with regular backups</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Limited employee access on a need-to-know basis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">5. Third-Party Services</h2>
                <p className="text-gray-700 leading-relaxed mb-4">We work with trusted third-party services:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Auth0:</strong> Secure authentication and user management</li>
                  <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
                  <li><strong>Vercel Analytics:</strong> Privacy-focused website analytics</li>
                  <li><strong>Broker APIs:</strong> When you choose to connect supported brokers for data import</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">6. Your Rights and Choices</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Access and download your trading data at any time</li>
                  <li>Delete your account and all associated data</li>
                  <li>Opt out of non-essential data collection</li>
                  <li>Request corrections to your account information</li>
                  <li>Disconnect broker integrations at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">7. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed">
                  We retain your trading data for as long as your account is active and for a reasonable period thereafter to comply with legal obligations. When you delete your account, we will permanently delete your trading data within 30 days, except where required by law to retain certain records.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">8. Cookies and Tracking</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use essential cookies for authentication and session management. We also use analytics cookies to understand how users interact with our platform. You have full control over which cookies we can use through our cookie consent system.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  For detailed information about the cookies we use, their purposes, and how to manage your preferences, please see our{' '}
                  <Link href="/cookies" className="text-[var(--theme-tertiary)] hover:underline">
                    Cookie Policy
                  </Link>. You can also manage your cookie preferences at any time in your{' '}
                  <Link href="/settings" className="text-[var(--theme-tertiary)] hover:underline">
                    account settings
                  </Link>.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">9. Updates to This Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this Privacy Policy periodically. We will notify you of any material changes by posting the new policy on our website and updating the "Last updated" date. Your continued use of Trade Voyager Analytics after changes are posted constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">10. Contact Us</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us at{' '}
                  <Link href="/contact" className="text-[var(--theme-tertiary)] hover:underline">
                    our contact page
                  </Link>{' '}
                  or email us directly. We are committed to addressing any privacy concerns promptly and transparently.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}