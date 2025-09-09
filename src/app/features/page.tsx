import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  FileText,
  Calendar,
  Database,
  ArrowRight,
  Check,
  Share2
} from 'lucide-react';
import Footer from '@/components/Footer';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import { BreadcrumbNavigation } from '@/components/SEO/BreadcrumbNavigation';
import { BreadcrumbStructuredData } from '@/components/SEO/StructuredData';
import { GettingStartedHowTo } from '@/components/SEO/HowToStructuredData';

export const metadata: Metadata = generateSEOMetadata('features');

export default function Features() {
  const breadcrumbItems = [
    { name: 'Features', url: '/features' }
  ];

  const coreFeatures = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Trade Analytics",
      description: "Comprehensive trade analytics with real-time P&L tracking, win rates, and detailed performance metrics for every trade.",
      features: ["Real-time P&L calculation", "Win/loss ratio analysis", "Risk-adjusted returns", "Trade performance attribution"]
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Trade Tracking",
      description: "Track every trade with detailed execution data, timing analysis, and performance breakdown.",
      features: ["Automated trade import", "Manual trade entry", "Trade categorization", "Historical performance"]
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Professional Reports",
      description: "Generate comprehensive trading reports with detailed insights and exportable formats.",
      features: ["Monthly/quarterly reports", "Performance summaries", "PDF export", "Custom date ranges"]
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Calendar View",
      description: "Visualize your trading performance over time with intuitive calendar-based insights.",
      features: ["Daily P&L overview", "Trading patterns", "Performance streaks", "Activity tracking"]
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Broker Integration",
      description: "Connect with major brokers for seamless data import and automated trade tracking.",
      features: ["Interactive Brokers", "TD Ameritrade", "CSV import", "API connectivity"]
    },
    {
      icon: <Share2 className="h-8 w-8" />,
      title: "Trade Records & Sharing",
      description: "View detailed trade records with entry/exit markers, individual executions, and profitability metrics. Share records via secure links.",
      features: ["Entry and exit markers", "Individual executions", "Profitability metrics", "Secure link sharing (14-day expiry)"]
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image 
              src="/trade-voyager-logo.png" 
              alt="Trade Voyager Analytics Logo" 
              width={48} 
              height={48} 
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
          </Link>
          <div className="flex space-x-4">
            <Link href="/demo">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                Try Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <BreadcrumbNavigation items={breadcrumbItems} />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-6xl font-bold text-[var(--theme-primary-text)] mb-6">
          Powerful Trade Analytics Features
        </h1>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-3xl mx-auto">
          Everything you need for comprehensive trade analytics and performance optimization with 
          professional-grade tools and enterprise security. Advanced trade analytics made simple. See our <Link href="/pricing" className="text-[var(--theme-tertiary)] hover:underline">simple pricing plans</Link> to get started.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/demo">
            <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-8 py-3 text-lg">
              Explore Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
          Core Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coreFeatures.map((feature, index) => (
            <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-[var(--theme-tertiary)]/10 rounded-lg text-[var(--theme-tertiary)]">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-[var(--theme-primary-text)]">
                    {feature.title}
                  </CardTitle>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>


      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-6">
          Ready to Elevate Your Trading?
        </h2>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-2xl mx-auto">
          Join thousands of professional traders who trust Trade Voyager Analytics to track and improve their performance. 
          Start with our <Link href="/demo" className="text-[var(--theme-tertiary)] hover:underline">free demo</Link> or explore our <Link href="/pricing" className="text-[var(--theme-tertiary)] hover:underline">pricing options</Link>.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/demo">
            <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10 px-8 py-3 text-lg">
              Try Free Demo
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-8 py-3 text-lg">
              Start Tracking <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <GettingStartedHowTo />
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <Footer />
    </div>
  );
}