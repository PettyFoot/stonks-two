'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, HelpCircle, Clock, Users } from 'lucide-react';
import { SEO_CONFIG } from '@/lib/seo';
import Footer from '@/components/Footer';
import ReCAPTCHA from 'react-google-recaptcha';

interface ContactPageComponentProps {
  discordInvite?: string;
}

export default function ContactPageComponent({ discordInvite }: ContactPageComponentProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    // Check if reCAPTCHA token exists (only if reCAPTCHA is configured)
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      alert('Please complete the reCAPTCHA verification');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '', category: 'general' });
        setRecaptchaToken(null);
        recaptchaRef.current?.reset();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-4">Contact Us</h1>
          <p className="text-xl text-[var(--theme-primary-text)] max-w-3xl mx-auto">
            Have questions about Trade Voyager Analytics? Need help with your account or trading analytics? 
            We're here to help you succeed with your trading journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-[var(--theme-primary-text)] flex items-center">
                  <MessageSquare className="h-6 w-6 mr-2 text-[var(--theme-tertiary)]" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme-tertiary)] focus:border-transparent"
                    >
                      <option value="general">General Question</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing & Subscriptions</option>
                      <option value="broker">Broker Integration</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief description of your inquiry"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please provide details about your question or issue. Include any error messages or steps you've already tried."
                      className="mt-1"
                    />
                  </div>

                  {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                        onChange={(token) => setRecaptchaToken(token)}
                        onExpired={() => setRecaptchaToken(null)}
                        onError={() => setRecaptchaToken(null)}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>

                  {submitStatus === 'success' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800">
                        Thank you for your message! We'll get back to you within 24 hours.
                      </p>
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800">
                        Sorry, there was an error sending your message. Please try again or email us directly.
                      </p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info & FAQ */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--theme-primary-text)] flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[var(--theme-tertiary)]" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)]">Support Email</h3>
                    <p className="text-gray-600">{SEO_CONFIG.supportEmail}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className="h-5 w-5 text-[var(--theme-tertiary)] mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[var(--theme-primary-text)]">Response Time</h3>
                      <p className="text-gray-600 text-sm">
                        We typically respond within 24 hours during business days. 
                        Premium users receive priority support.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Common Questions */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--theme-primary-text)] flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-[var(--theme-tertiary)]" />
                  Common Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)] mb-1">How do I import my trades?</h3>
                    <p className="text-sm text-gray-600">
                      You can import trades via CSV upload or connect directly with supported brokers like Interactive Brokers and TD Ameritrade.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)] mb-1">Is my trading data secure?</h3>
                    <p className="text-sm text-gray-600">
                      Yes! We use bank-level encryption and complete user data isolation. Your trading data is never shared or mixed with other users.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)] mb-1">Can I cancel my subscription?</h3>
                    <p className="text-sm text-gray-600">
                      Yes, you can cancel your subscription at any time from your account settings. Your data remains accessible until the end of your billing period.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)] mb-1">Which brokers do you support?</h3>
                    <p className="text-sm text-gray-600">
                      We support Interactive Brokers, TD Ameritrade, and many others. You can also import data via CSV from any broker.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Demo CTA */}
            <Card className="bg-gradient-to-r from-[var(--theme-tertiary)]/10 to-[var(--theme-green)]/10 border-[var(--theme-tertiary)]/30">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-[var(--theme-tertiary)] mb-2">Try Before You Ask</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Experience Trade Voyager Analytics with our demo mode - no signup required!
                </p>
                <Link href="/demo">
                  <Button className="w-full bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                    Launch Demo
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Discord Community */}
            {discordInvite && (
              <Card className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--theme-primary-text)] flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                    Join Our Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Connect with other traders, share strategies, get real-time help, and stay updated with the latest features.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>✓</span>
                        <span>Real-time trading discussions</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>✓</span>
                        <span>Feature updates & announcements</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>✓</span>
                        <span>Direct support from the team</span>
                      </div>
                    </div>
                    <a
                      href={discordInvite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Join Discord Community
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}