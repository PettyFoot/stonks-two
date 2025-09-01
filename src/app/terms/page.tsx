import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service - Trade Voyager',
  description: 'Trade Voyager terms of service covering usage rights, responsibilities, and legal agreements for our trading analytics platform.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager</span>
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
            <h1 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-8">Terms of Service</h1>
            <p className="text-sm text-gray-600 mb-8">Last updated: January 1, 2025</p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  By accessing or using Trade Voyager, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform. Trade Voyager is a professional trading analytics platform designed to help traders track, analyze, and improve their trading performance.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Trade Voyager provides professional trading analytics services including:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Real-time P&L tracking and performance analytics</li>
                  <li>Win rate calculations and risk metrics analysis</li>
                  <li>Comprehensive trading reports and insights</li>
                  <li>Broker integration capabilities (Interactive Brokers, TD Ameritrade, and others)</li>
                  <li>Trading calendar and historical performance tracking</li>
                  <li>Custom filters and search functionality for trade analysis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">3. User Accounts and Registration</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  To use Trade Voyager, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Provide accurate and complete information during registration</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Be responsible for all activities that occur under your account</li>
                  <li>Use the service only for lawful purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">4. Subscription Plans and Billing</h2>
                <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Free Plan</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We offer a free tier with limited features to help you get started with trade tracking and basic analytics.
                </p>
                
                <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Premium Plans</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Premium subscriptions provide access to advanced features including unlimited trades, comprehensive reports, broker integrations, and priority support. Billing is handled securely through Stripe.
                </p>
                
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Subscriptions automatically renew unless cancelled</li>
                  <li>You may cancel your subscription at any time</li>
                  <li>Refunds are handled according to our refund policy</li>
                  <li>Price changes will be communicated with 30 days notice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">5. Trading Data and Broker Integration</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  When using our broker integration features:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You retain full ownership of your trading data</li>
                  <li>We access only the data necessary to provide our services</li>
                  <li>You can disconnect broker integrations at any time</li>
                  <li>We do not execute trades or access trading accounts beyond read-only data</li>
                  <li>You are responsible for the accuracy of manually entered trade data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">6. Prohibited Uses</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You may not use Trade Voyager to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Share account access with unauthorized users</li>
                  <li>Attempt to reverse engineer or compromise our platform</li>
                  <li>Upload malicious code or attempt to hack our systems</li>
                  <li>Use automated tools to scrape or harvest data from our platform</li>
                  <li>Interfere with other users' access to the service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">7. Intellectual Property</h2>
                <p className="text-gray-700 leading-relaxed">
                  Trade Voyager and its content are protected by intellectual property laws. You retain ownership of your trading data, but grant us the right to use it solely for providing our services. Our platform, algorithms, and design elements remain our exclusive property. You may not reproduce, distribute, or create derivative works without our written permission.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">8. Disclaimers and Limitations</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>IMPORTANT:</strong> Trade Voyager is an analytics tool only. We provide:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                  <li>No investment advice or trading recommendations</li>
                  <li>No guarantee of trading profits or performance improvement</li>
                  <li>Analytics and reporting tools for informational purposes only</li>
                  <li>The service "as-is" without warranties of any kind</li>
                </ul>
                
                <p className="text-gray-700 leading-relaxed">
                  You acknowledge that trading involves substantial risk of loss and that past performance does not guarantee future results. We are not responsible for trading decisions made based on information from our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">9. Data Security and Backups</h2>
                <p className="text-gray-700 leading-relaxed">
                  While we implement robust security measures and regular backups, you are responsible for maintaining your own records of important trading data. We recommend exporting your data regularly as an additional precaution. We cannot guarantee 100% uptime or data recovery in all circumstances.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">10. Termination</h2>
                <p className="text-gray-700 leading-relaxed">
                  Either party may terminate your account at any time. Upon termination, your access to the platform will cease, and your data will be handled according to our Privacy Policy. We may suspend or terminate accounts for violations of these terms or for any reason with reasonable notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">11. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update these Terms of Service periodically. Material changes will be communicated through our platform or via email with at least 30 days notice. Your continued use of Trade Voyager after changes are posted constitutes acceptance of the updated terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">12. Governing Law and Disputes</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Terms of Service are governed by applicable laws. Any disputes will be resolved through binding arbitration where permitted by law. You agree to resolve disputes individually and not as part of a class action.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">13. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have questions about these Terms of Service, please contact us through{' '}
                  <Link href="/contact" className="text-[var(--theme-tertiary)] hover:underline">
                    our contact page
                  </Link>. We are committed to addressing your concerns and maintaining clear communication about our terms and policies.
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