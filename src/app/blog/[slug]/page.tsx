import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { BlogCategoryBadge } from '@/components/blog/BlogCategoryBadge';
import { BlogPostStructuredData } from '@/components/blog/BlogStructuredData';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { BlogCTAButton } from '@/components/blog/BlogCTAButton';
import { BlogNav } from '@/components/blog/BlogNav';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: {
      slug,
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    },
  });

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || '',
    openGraph: {
      type: 'article',
      url: `https://yoursite.com/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt || '',
      images: post.coverImage ? [{ url: post.coverImage }] : [],
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || '',
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    },
    select: { slug: true },
    take: 100,
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export const revalidate = 3600; // Revalidate every hour

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: {
      slug,
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    },
    include: {
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
  });

  if (!post) {
    notFound();
  }

  // Get related posts
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
      id: { not: post.id },
      tags: {
        some: {
          tagId: {
            in: post.tags.map(t => t.tag.id),
          },
        },
      },
    },
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
    take: 3,
  });

  const transformedPost = {
    ...post,
    tags: post.tags.map(t => t.tag),
  };

  const transformedRelated = relatedPosts.map(p => ({
    ...p,
    tags: p.tags.map(t => t.tag),
  }));

  return (
    <>
      <BlogPostStructuredData
        post={transformedPost}
        siteUrl="https://yoursite.com"
      />

      <BlogNav />

      <div className="min-h-screen bg-gray-50">
        <article className="bg-white">
          {/* Header */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>

            {transformedPost.coverImage && (
              <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden">
                <Image
                  src={transformedPost.coverImage}
                  alt={transformedPost.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {transformedPost.tags.map((tag) => (
                <BlogCategoryBadge key={tag.id} name={tag.name} />
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {transformedPost.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-8">
              <span>By {transformedPost.author}</span>
              <span>•</span>
              <span>
                {transformedPost.publishedAt && format(new Date(transformedPost.publishedAt), 'MMMM dd, yyyy')}
              </span>
              <span>•</span>
              <span>{transformedPost.viewCount} views</span>
            </div>

            <BlogCTAButton />
          </div>

          {/* Content */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <BlogPostContent content={transformedPost.content} />

            <BlogCTAButton />
          </div>
        </article>

        {/* Related Posts */}
        {transformedRelated.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {transformedRelated.map((relatedPost) => (
                <BlogPostCard key={relatedPost.id} {...relatedPost} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}