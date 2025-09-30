import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});

const CreatePostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional(),
  author: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const skip = (query.page - 1) * query.limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [posts, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
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
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

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
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    console.error('Error fetching admin blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminAuth();
    const body = await request.json();
    const data = CreatePostSchema.parse(body);

    // Check if slug already exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: data.slug },
    });

    if (existingPost) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    // Handle tags (find or create)
    const tagConnections = await Promise.all(
      data.tags.map(async (tagName) => {
        const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');

        // Find or create tag
        const tag = await prisma.blogTag.upsert({
          where: { slug: tagSlug },
          create: {
            name: tagName,
            slug: tagSlug,
            postCount: 0,
          },
          update: {},
        });

        return tag.id;
      })
    );

    // Create post
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage,
        author: data.author,
        authorId: user.id,
        status: data.status,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        publishedAt: data.publishedAt
          ? new Date(data.publishedAt)
          : data.status === 'PUBLISHED'
          ? new Date()
          : null,
        tags: {
          create: tagConnections.map(tagId => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        },
      },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    // Update tag counts
    await prisma.blogTag.updateMany({
      where: {
        id: { in: tagConnections },
      },
      data: {
        postCount: { increment: 1 },
      },
    });

    // Transform tags structure
    const transformedPost = {
      ...post,
      tags: post.tags.map(t => t.tag),
    };

    return NextResponse.json({ post: transformedPost }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}