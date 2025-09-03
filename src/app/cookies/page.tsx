import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy - Trade Voyager Analytics',
  description: 'Learn about how Trade Voyager Analytics uses cookies and similar technologies to enhance your experience and provide our services.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicy() {
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
            <h1 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-8">Cookie Policy</h1>
            <p className="text-sm text-gray-600 mb-8">Last updated: January 1, 2025</p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">What Are Cookies</h2>
                <p className="text-gray-700 leading-relaxed">
                  Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences, keeping you logged in, and analyzing how you use our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">How We Use Cookies</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Trade Voyager Analytics uses cookies and similar technologies for several purposes:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>To keep you securely logged in to your account</li>
                  <li>To remember your preferences and settings</li>
                  <li>To analyze website performance and usage patterns</li>
                  <li>To ensure the security of our platform</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Types of Cookies We Use</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Essential Cookies (Always Enabled)</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      These cookies are necessary for our website to function properly and cannot be disabled.
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                      <li><strong>Authentication cookies</strong> - Keep you logged in securely (Auth0)</li>
                      <li><strong>Session cookies</strong> - Maintain your session state</li>
                      <li><strong>Security cookies</strong> - Protect against cross-site attacks</li>
                      <li><strong>Cookie consent</strong> - Remember your cookie preferences</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Functional Cookies (Optional)</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      These cookies enhance your experience by remembering your preferences.
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                      <li><strong>Theme preferences</strong> - Remember your chosen theme</li>
                      <li><strong>Table settings</strong> - Remember column visibility and sorting preferences</li>
                      <li><strong>Dashboard layout</strong> - Remember your customized dashboard configuration</li>
                      <li><strong>Filter preferences</strong> - Remember your default filters and views</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">Analytics Cookies (Optional)</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      These cookies help us understand how you use our platform to improve our services.
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                      <li><strong>Vercel Analytics</strong> - Privacy-focused website analytics</li>
                      <li><strong>Performance monitoring</strong> - Core Web Vitals and performance metrics</li>
                      <li><strong>Usage patterns</strong> - Anonymized data about feature usage</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Third-Party Cookies</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We work with trusted third-party services that may set their own cookies:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Auth0</strong> - Secure authentication and user management</li>
                  <li><strong>Stripe</strong> - Payment processing (only on payment pages)</li>
                  <li><strong>Vercel</strong> - Website hosting and analytics</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  These services have their own privacy policies and cookie practices. We recommend reviewing their policies for complete information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Managing Your Cookie Preferences</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You have several options for controlling cookies:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">On Our Website</h3>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>Use the cookie banner when you first visit our site</li>
                      <li>Update your preferences in your account settings</li>
                      <li>Click "Manage Cookies" in the footer at any time</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-[var(--theme-primary-text)] mb-2">In Your Browser</h3>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>Block all cookies (may affect website functionality)</li>
                      <li>Delete existing cookies</li>
                      <li>Set preferences for specific websites</li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-2">
                      Note: Blocking essential cookies will prevent you from using our platform.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Cookie Retention</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Different cookies have different lifespans:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Session cookies</strong> - Deleted when you close your browser</li>
                  <li><strong>Authentication cookies</strong> - Expire based on your login preferences</li>
                  <li><strong>Preference cookies</strong> - Stored for up to 1 year</li>
                  <li><strong>Consent cookies</strong> - Stored for up to 1 year</li>
                  <li><strong>Analytics cookies</strong> - Stored for up to 2 years (anonymized)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Your Rights</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Under applicable privacy laws (GDPR, CCPA, etc.), you have the right to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Know what cookies we use and why</li>
                  <li>Consent to or refuse non-essential cookies</li>
                  <li>Change your cookie preferences at any time</li>
                  <li>Access and delete your data</li>
                  <li>File a complaint with relevant authorities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Updates to This Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this Cookie Policy periodically to reflect changes in our practices or applicable laws. We will notify you of any material changes by updating the "Last updated" date and, where appropriate, providing notice through our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[var(--theme-primary-text)] mb-4">Contact Us</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have questions about this Cookie Policy or our cookie practices, please contact us through{' '}
                  <Link href="/contact" className="text-[var(--theme-tertiary)] hover:underline">
                    our contact page
                  </Link>{' '}
                  or refer to our{' '}
                  <Link href="/privacy" className="text-[var(--theme-tertiary)] hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  for additional information about how we handle your data.
                </p>
              </section>
            </div>

            {/* Quick Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap gap-4">
                <Button asChild>
                  <Link href="/privacy">View Privacy Policy</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings">Manage Cookie Preferences</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}