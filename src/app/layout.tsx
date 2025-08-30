import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import { OrganizationStructuredData } from "@/components/SEO";
import { SEO_CONFIG } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true, // Optimize font loading for Core Web Vitals
});

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  title: {
    default: "Trade Voyager - Professional Trading Analytics Platform",
    template: "%s | Trade Voyager"
  },
  description: SEO_CONFIG.siteDescription,
  keywords: [
    ...SEO_CONFIG.keywords.primary,
    ...SEO_CONFIG.keywords.secondary,
    ...SEO_CONFIG.keywords.technical
  ].join(', '),
  authors: [{ name: SEO_CONFIG.siteName, url: SEO_CONFIG.siteUrl }],
  creator: SEO_CONFIG.siteName,
  publisher: SEO_CONFIG.siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SEO_CONFIG.siteName,
    title: 'Trade Voyager - Professional Trading Analytics Platform',
    description: SEO_CONFIG.siteDescription,
    url: SEO_CONFIG.siteUrl,
    images: [
      {
        url: '/trade-voyager-logo.png',
        width: 1200,
        height: 630,
        alt: 'Trade Voyager - Professional Trading Analytics Platform',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: SEO_CONFIG.twitterHandle,
    creator: SEO_CONFIG.twitterHandle,
    title: 'Trade Voyager - Professional Trading Analytics Platform',
    description: SEO_CONFIG.siteDescription,
    images: ['/trade-voyager-logo.png'],
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
  },
  category: 'Finance',
  classification: 'Trading Analytics Software',
  other: {
    'application-name': SEO_CONFIG.siteName,
    'apple-mobile-web-app-title': SEO_CONFIG.siteName,
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#2563eb',
    'color-scheme': 'light',
    'referrer': 'origin-when-cross-origin',
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" />
        
        {/* DNS prefetch for potential external resources */}
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        
        {/* Structured Data for Organization */}
        <OrganizationStructuredData />
        
        {/* Google AdSense global script */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7836991491773203"
          crossOrigin="anonymous"
        />
        
        {/* Resource hints for critical CSS */}
      </head>
      <body className={`${inter.variable} antialiased min-h-screen`} suppressHydrationWarning>
        {/* Skip to main content for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        
        <Providers>
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
        </Providers>
        
        {/* Analytics */}
        <Analytics />
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Report Web Vitals to analytics
              function sendToAnalytics(metric) {
                const body = JSON.stringify(metric);
                if (navigator.sendBeacon) {
                  navigator.sendBeacon('/api/vitals', body);
                } else {
                  fetch('/api/vitals', { body, method: 'POST', keepalive: true });
                }
              }
              
              // Initialize web vitals reporting
              if (typeof window !== 'undefined') {
                import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                  getCLS(sendToAnalytics);
                  getFID(sendToAnalytics);
                  getFCP(sendToAnalytics);
                  getLCP(sendToAnalytics);
                  getTTFB(sendToAnalytics);
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
