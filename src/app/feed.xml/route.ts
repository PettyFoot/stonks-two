import { SEO_CONFIG } from '@/lib/seo';

export async function GET() {
  // Sample content - replace with actual blog/resource content from your CMS or database
  const articles = [
    {
      title: 'Day Trading Basics: A Complete Guide',
      description: 'Learn the fundamentals of day trading including strategies, risk management, and essential tools for beginners.',
      url: '/resources/day-trading-basics',
      publishedAt: '2024-01-15T10:00:00Z',
      category: 'Trading Strategies',
    },
    {
      title: 'Position Sizing: The Key to Long-term Success',
      description: 'Master position sizing techniques to protect your capital and maximize returns in trading.',
      url: '/resources/position-sizing-guide',
      publishedAt: '2024-01-10T10:00:00Z',
      category: 'Risk Management',
    },
    {
      title: 'Technical Analysis: Chart Patterns Guide',
      description: 'Complete guide to reading and interpreting chart patterns for better trading decisions.',
      url: '/resources/chart-patterns-guide',
      publishedAt: '2024-01-05T10:00:00Z',
      category: 'Market Analysis',
    },
    {
      title: 'Trading Psychology: Overcoming Emotional Trading',
      description: 'Learn how to master your emotions and develop the right mindset for consistent trading success.',
      url: '/resources/trading-psychology-challenges',
      publishedAt: '2024-01-01T10:00:00Z',
      category: 'Trading Psychology',
    },
  ];

  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SEO_CONFIG.siteName} - Trading Resources</title>
    <description>${SEO_CONFIG.siteDescription}</description>
    <link>${SEO_CONFIG.siteUrl}</link>
    <language>en-US</language>
    <managingEditor>${SEO_CONFIG.supportEmail} (Trading Analytics Team)</managingEditor>
    <webMaster>${SEO_CONFIG.supportEmail} (Trading Analytics Team)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SEO_CONFIG.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <title>${SEO_CONFIG.siteName}</title>
      <url>${SEO_CONFIG.siteUrl}/trade-voyager-logo.png</url>
      <link>${SEO_CONFIG.siteUrl}</link>
      <width>144</width>
      <height>144</height>
    </image>
    ${articles
      .map(
        (article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <description><![CDATA[${article.description}]]></description>
      <link>${SEO_CONFIG.siteUrl}${article.url}</link>
      <guid isPermaLink="true">${SEO_CONFIG.siteUrl}${article.url}</guid>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <category><![CDATA[${article.category}]]></category>
      <dc:creator><![CDATA[Trading Analytics Team]]></dc:creator>
    </item>`
      )
      .join('')}
  </channel>
</rss>`;

  return new Response(rssContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}