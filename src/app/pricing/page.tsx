import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  ArrowRight, 
  Star,
  Zap,
  Shield,
  Users,
  BarChart3
} from 'lucide-react';
import Footer from '@/components/Footer';
import { FAQStructuredData } from '@/components/SEO/FAQStructuredData';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import { BreadcrumbNavigation } from '@/components/SEO/BreadcrumbNavigation';
import { BreadcrumbStructuredData } from '@/components/SEO/StructuredData';
import { OptimizePerformanceHowTo } from '@/components/SEO/HowToStructuredData';

export const metadata: Metadata = generateSEOMetadata('pricing');

export default function Pricing() {
  const breadcrumbItems = [
    { name: 'Pricing', url: '/pricing' }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "powerful analytics for everyone",
      badge: "Popular",
      badgeVariant: "secondary" as const,
      features: [
        "Full platform access",
        "All analytics features",
        "No credit card required"
      ],
      limitations: [
        "Not all brokers available"
      ],
      cta: "Try Demo",
      ctaLink: "/demo",
      highlight: false
    },
    {
      name: "Professional",
      price: "$10",
      period: "month",
      description: "For serious traders who want to improve their performance",
      badge: "Best Value",
      badgeVariant: "default" as const,
      features: [
        "Unlimited trade tracking",
        "All broker integrations",
        "Advanced analytics",
        "Data export"
      ],
      limitations: [],
      cta: "Start Free Trial",
      ctaLink: "/login",
      highlight: true
    }
  ];

  const faqs = [
    {
      question: "Is there a free trial?",
      answer: "There is no typical free trial because its just free. For professional plan we offer a 14 day free trial with full access to all broker integrations."
    },
    {
      question: "Which brokers do you support?",
      answer: "we support seamless broker integrations with most us brokers. we also offer csv upload support for most us brokers. if we don't currently offer support of your broker contact support and we will set it up."
    },
    {
      question: "Is my trading data secure?",
      answer: "Absolutely. We use bank-level security with complete user data isolation, encryption in transit and at rest, and regular security audits."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes! Annual subscribers save 20% compared to monthly billing. Contact us for more details."
    }
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
            <Link href="/features">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                Features
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                Try Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                Sign In
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
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-3xl mx-auto">
          Get ready to start harness the power of advanced trade analytics. Start with <strong>no cost</strong> and all of the tools. Upgrade for more seamless broker integration and delve deeper into advanced analytics. See all <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline">platform features</Link> in detail.
        </p>
        <div className="flex justify-center items-center space-x-4 text-[var(--theme-primary-text)]">
          <span>No setup fees</span>
          <span>•</span>
          <span>Cancel anytime</span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
                plan.highlight ? 'ring-2 ring-[var(--theme-tertiary)] scale-105' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant={plan.badgeVariant} className={
                    plan.badgeVariant === 'default' 
                      ? 'bg-[var(--theme-tertiary)] text-white' 
                      : ''
                  }>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-[var(--theme-primary-text)] mb-2">
                  {plan.name}
                </CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-[var(--theme-primary-text)]">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600">/{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-[var(--theme-primary-text)] mb-3">Includes:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[var(--theme-primary-text)] mb-3">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <X className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Link href={plan.ctaLink} className="block">
                  <Button 
                    className={`w-full ${
                      plan.highlight 
                        ? 'bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white' 
                        : 'bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/80 text-white'
                    }`}
                  >
                    {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Comparison */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
          Why Choose Trade Voyager Analytics?
        </h2>
        
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="p-4 bg-[var(--theme-tertiary)]/10 rounded-lg mb-4 inline-block">
              <BarChart3 className="h-8 w-8 text-[var(--theme-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-2">
              Professional Analytics
            </h3>
            <p className="text-gray-600">
              Advanced trading analytics trusted by professional traders worldwide.
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-[var(--theme-tertiary)]/10 rounded-lg mb-4 inline-block">
              <Shield className="h-8 w-8 text-[var(--theme-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-2">
              Bank-Level Security
            </h3>
            <p className="text-gray-600">
              Your trading data is protected with enterprise-grade security measures.
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-[var(--theme-tertiary)]/10 rounded-lg mb-4 inline-block">
              <Zap className="h-8 w-8 text-[var(--theme-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-2">
              Easy Integration
            </h3>
            <p className="text-gray-600">
              Connect your broker accounts in minutes with our seamless integrations.
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-[var(--theme-tertiary)]/10 rounded-lg mb-4 inline-block">
              <Users className="h-8 w-8 text-[var(--theme-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-2">
              Expert Support
            </h3>
            <p className="text-gray-600">
              Get help from our team of trading analytics experts whenever you need it.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--theme-primary-text)]">
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-[var(--theme-primary-text)] mb-4">
            Still have questions?
          </p>
          <Link href="/contact">
            <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
              Contact Support
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-6">
          Ready to Improve Your Trading?
        </h2>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-2xl mx-auto">
          Join thousands of traders who use Trade Voyager Analytics to track and improve their performance. 
          Discover all our <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline">powerful features</Link> or start with our <Link href="/demo" className="text-[var(--theme-tertiary)] hover:underline">free demo</Link>.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/demo">
            <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10 px-8 py-3 text-lg">
              Try Free Demo
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-8 py-3 text-lg">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <OptimizePerformanceHowTo />
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <FAQStructuredData faqs={faqs} />
      <Footer />
    </div>
  );
}