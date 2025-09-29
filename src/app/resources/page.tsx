import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  TrendingUp,
  Calculator,
  Shield,
  BarChart3,
  Users,
  Clock,
  ArrowRight
} from 'lucide-react';
import Footer from '@/components/Footer';
import { BreadcrumbStructuredData } from '@/components/SEO/StructuredData';
import { ServiceStructuredData } from '@/components/SEO/ServiceStructuredData';

export const metadata: Metadata = {
  title: 'Trading Resources & Guides | Professional Trading Education',
  description: 'Free trading resources, guides, and educational content. Learn trading strategies, risk management, and market analysis from professional traders.',
  keywords: 'trading guides, trading education, trading resources, trading strategies, day trading tips, swing trading, options trading',
};

const resourceCategories = [
  {
    title: 'Trading Strategies',
    description: 'Proven trading strategies and methodologies',
    icon: TrendingUp,
    articles: [
      { title: 'Day Trading Basics: A Complete Guide', slug: 'day-trading-basics', readTime: '8 min' },
      { title: 'Swing Trading Strategies for Beginners', slug: 'swing-trading-strategies', readTime: '12 min' },
      { title: 'Options Trading: Advanced Techniques', slug: 'options-trading-advanced', readTime: '15 min' },
    ]
  },
  {
    title: 'Risk Management',
    description: 'Essential risk management techniques',
    icon: Shield,
    articles: [
      { title: 'Position Sizing: The Key to Long-term Success', slug: 'position-sizing-guide', readTime: '10 min' },
      { title: 'Stop Loss Strategies That Actually Work', slug: 'stop-loss-strategies', readTime: '7 min' },
      { title: 'Portfolio Diversification for Traders', slug: 'portfolio-diversification', readTime: '11 min' },
    ]
  },
  {
    title: 'Market Analysis',
    description: 'Technical and fundamental analysis guides',
    icon: BarChart3,
    articles: [
      { title: 'Technical Analysis: Chart Patterns Guide', slug: 'chart-patterns-guide', readTime: '14 min' },
      { title: 'Understanding Market Sentiment Indicators', slug: 'market-sentiment-indicators', readTime: '9 min' },
      { title: 'Economic Events and Trading Opportunities', slug: 'economic-events-trading', readTime: '13 min' },
    ]
  },
  {
    title: 'Trading Psychology',
    description: 'Mental aspects of successful trading',
    icon: Users,
    articles: [
      { title: 'Overcoming Trading Psychology Challenges', slug: 'trading-psychology-challenges', readTime: '11 min' },
      { title: 'Building Discipline in Your Trading', slug: 'building-trading-discipline', readTime: '8 min' },
      { title: 'Managing Emotions During Market Volatility', slug: 'managing-trading-emotions', readTime: '10 min' },
    ]
  }
];

const featuredTools = [
  {
    title: 'Position Size Calculator',
    description: 'Calculate optimal position sizes based on your risk tolerance',
    link: '/tools/position-calculator',
    icon: Calculator
  },
  {
    title: 'Risk/Reward Calculator',
    description: 'Analyze potential trade outcomes before entering positions',
    link: '/tools/risk-reward-calculator',
    icon: BarChart3
  },
  {
    title: 'Trading Journal Template',
    description: 'Free template to track and analyze your trades',
    link: '/tools/trading-journal-template',
    icon: BookOpen
  }
];

export default function ResourcesPage() {
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
              <Button variant="outline" size="sm">
                Try Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-primary-text)] mb-6">
            Trading Resources & Education
          </h1>
          <p className="text-xl text-[var(--theme-secondary-text)] mb-8 max-w-3xl mx-auto">
            Free guides, strategies, and tools to help you become a more successful trader.
            Learn from professional traders and improve your performance.
          </p>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
            Browse by Category
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {resourceCategories.map((category) => (
              <Card key={category.title} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-[var(--theme-accent)]/20 rounded-lg">
                      <category.icon className="w-6 h-6 text-[var(--theme-accent)]" />
                    </div>
                    <div>
                      <CardTitle className="text-[var(--theme-primary-text)]">
                        {category.title}
                      </CardTitle>
                      <p className="text-[var(--theme-secondary-text)] text-sm">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.articles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/resources/${article.slug}`}
                        className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-[var(--theme-primary-text)] group-hover:text-[var(--theme-accent)] transition-colors">
                            {article.title}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-[var(--theme-secondary-text)]">
                            <Clock className="w-4 h-4" />
                            <span>{article.readTime}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-16 px-6 bg-black/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
            Free Trading Tools
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredTools.map((tool) => (
              <Card key={tool.title} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-[var(--theme-accent)]/20 rounded-lg">
                      <tool.icon className="w-6 h-6 text-[var(--theme-accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--theme-primary-text)]">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-[var(--theme-secondary-text)] mb-4">
                    {tool.description}
                  </p>
                  <Link href={tool.link}>
                    <Button variant="outline" className="w-full group">
                      Use Tool
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-6">
            Ready to Track Your Trading Performance?
          </h2>
          <p className="text-xl text-[var(--theme-secondary-text)] mb-8">
            Put these strategies into practice with our professional trading analytics platform.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/demo">
              <Button size="lg" className="group">
                Try Free Demo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <BreadcrumbStructuredData items={[{ name: 'Resources', url: '/resources' }]} />
      <ServiceStructuredData />
      <Footer />
    </div>
  );
}