import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  tag: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['publishedAt', 'viewCount', 'title']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const query = QuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      tag: searchParams.get('tag'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    const skip = (query.page - 1) * query.limit;

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    };

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            slug: query.tag,
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Execute queries in parallel
    const [posts, totalCount] = await Promise.all([
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
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip,
        take: query.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    // Transform tags structure
    const transformedPosts = posts.map(post => ({
      ...post,
      tags: post.tags.map(t => t.tag),
    }));

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasMore: query.page < totalPages,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}