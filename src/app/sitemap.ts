import { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SEO_CONFIG.siteUrl;
  const currentDate = new Date().toISOString();

  return [
    // Public pages - High priority
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    
    // Demo pages - Medium priority (publicly accessible)
    {
      url: `${baseUrl}/demo/dashboard`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/trades`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/reports`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/calendar`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/records`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/import`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/new-trade`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/search`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/community`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    
    // Note: Private authenticated pages are intentionally excluded:
    // - /dashboard
    // - /trades
    // - /reports
    // - /calendar
    // - /records
    // - /import
    // - /new-trade
    // - /search
    // These should not be indexed as they require authentication
    
    // Future public pages can be added here:
    // - /about
    // - /pricing
    // - /features
    // - /contact
    // - /help
    // - /privacy
    // - /terms
    // - /blog
  ];
}