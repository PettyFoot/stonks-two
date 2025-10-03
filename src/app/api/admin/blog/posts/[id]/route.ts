import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1).optional(),
  coverImage: z.string().url().optional().nullable(),
  author: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  isAutosave: z.boolean().optional(),
});

// Relaxed schema for autosaves - allows empty or partial fields
const AutosaveUpdateSchema = z.object({
  title: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  isAutosave: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const transformedPost = {
      ...post,
      tags: post.tags.map(t => t.tag),
    };

    return NextResponse.json({ post: transformedPost });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    console.error('Error fetching blog post:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;
    const body = await request.json();

    // Use different schema based on whether this is an autosave
    const isAutosave = body.isAutosave === true;
    const data = isAutosave
      ? AutosaveUpdateSchema.parse(body)
      : UpdatePostSchema.parse(body);

    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existingPost.slug) {
      const slugExists = await prisma.blogPost.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Handle tags if provided (only update when explicitly provided, not undefined)
    let tagUpdates = {};
    if (data.tags !== undefined) {
      // Get existing tag IDs to decrement their counts
      const existingTagIds = existingPost.tags.map(t => t.tagId);

      // Decrement counts on old tags
      if (existingTagIds.length > 0) {
        await prisma.blogTag.updateMany({
          where: { id: { in: existingTagIds } },
          data: { postCount: { decrement: 1 } },
        });
      }

      // Remove old tag connections
      await prisma.blogPostTag.deleteMany({
        where: { postId: id },
      });

      // Only create new tags if the array is not empty
      if (data.tags.length > 0) {
        // Create new tag connections
        const tagConnections = await Promise.all(
          data.tags.map(async (tagName) => {
            const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
            const tag = await prisma.blogTag.upsert({
              where: { slug: tagSlug },
              create: { name: tagName, slug: tagSlug, postCount: 1 },
              update: { postCount: { increment: 1 } },
            });
            return tag.id;
          })
        );

        tagUpdates = {
          tags: {
            create: tagConnections.map(tagId => ({
              tag: { connect: { id: tagId } },
            })),
          },
        };
      }
    }

    // Handle publishedAt logic
    let publishedAt = existingPost.publishedAt;
    if (data.status === 'PUBLISHED' && !publishedAt) {
      publishedAt = new Date();
    } else if (data.publishedAt !== undefined) {
      publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    }

    // Build update data without tags field
    const updateData: any = {
      ...(data.title && { title: data.title }),
      ...(data.slug && { slug: data.slug }),
      ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
      ...(data.content && { content: data.content }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.author && { author: data.author }),
      ...(data.status && { status: data.status }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      publishedAt,
      ...tagUpdates,
    };

    // Update post
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    const transformedPost = {
      ...updatedPost,
      tags: updatedPost.tags.map((t: any) => t.tag),
    };

    return NextResponse.json({ post: transformedPost });
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

    console.error('Error updating blog post:', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete post (cascade will delete tags)
    await prisma.blogPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
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

    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}