import React from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { BlogNav } from '@/components/blog/BlogNav';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Blog | Trading Insights & Resources',
  description: 'Expert trading strategies, market analysis, and platform updates from Trade Voyager Analytics',
};

export const revalidate = 60; // Revalidate every 60 seconds

interface PageProps {
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const tag = params.tag;
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: any = {
    status: 'PUBLISHED',
    publishedAt: { lte: new Date() },
  };

  if (tag) {
    where.tags = {
      some: {
        tag: {
          slug: tag,
        },
      },
    };
  }

  const [posts, totalCount, tags] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        author: true,
        publishedAt: true,
        viewCount: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
    prisma.blogTag.findMany({
      where: {
        posts: {
          some: {
            post: {
              status: 'PUBLISHED',
              publishedAt: { lte: new Date() },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        postCount: true,
      },
      orderBy: { postCount: 'desc' },
      take: 10,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const transformedPosts = posts.map(post => ({
    ...post,
    tags: post.tags.map(t => t.tag),
  }));

  return (
    <>
      <BlogNav />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trading Insights & Resources</h1>
          <p className="text-xl text-gray-600">
            Expert strategies, market analysis, and platform updates
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {transformedPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6">
                  {transformedPosts.map((post) => (
                    <BlogPostCard key={post.id} {...post} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-12">
                    {page > 1 && (
                      <Link href={`/blog?page=${page - 1}${tag ? `&tag=${tag}` : ''}`}>
                        <Button variant="outline">Previous</Button>
                      </Link>
                    )}
                    <span className="flex items-center px-4 text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link href={`/blog?page=${page + 1}${tag ? `&tag=${tag}` : ''}`}>
                        <Button variant="outline">Next</Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="font-semibold text-lg mb-4">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link key={t.id} href={`/blog?tag=${t.slug}`}>
                    <Button
                      variant={tag === t.slug ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                    >
                      {t.name} ({t.postCount})
                    </Button>
                  </Link>
                ))}
                {tag && (
                  <Link href="/blog">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Clear filter
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}