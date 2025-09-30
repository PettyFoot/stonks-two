import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const [totalPosts, publishedPosts, draftPosts, totalViews, totalTags, topPosts] =
      await Promise.all([
        prisma.blogPost.count(),
        prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
        prisma.blogPost.count({ where: { status: 'DRAFT' } }),
        prisma.blogPost.aggregate({
          _sum: { viewCount: true },
        }),
        prisma.blogTag.count(),
        prisma.blogPost.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            slug: true,
            viewCount: true,
          },
          orderBy: { viewCount: 'desc' },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews: totalViews._sum.viewCount || 0,
      totalTags,
      topPosts,
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

    console.error('Error fetching blog stats:', error);
    return NextResponse.json({ error: 'Failed to fetch blog statistics' }, { status: 500 });
  }
}