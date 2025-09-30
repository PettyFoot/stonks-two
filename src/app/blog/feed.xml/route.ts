import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        author: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Trade Voyager Analytics Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Trading insights, strategies, and market analysis</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map(
        (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <description>${escapeXml(post.excerpt || '')}</description>
      <author>${escapeXml(post.author)}</author>
      <pubDate>${post.publishedAt ? new Date(post.publishedAt).toUTCString() : ''}</pubDate>
      <guid>${siteUrl}/blog/${post.slug}</guid>
    </item>`
      )
      .join('')}
  </channel>
</rss>`;

    return new Response(feed, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return NextResponse.json({ error: 'Failed to generate RSS feed' }, { status: 500 });
  }
}