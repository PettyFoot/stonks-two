import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const tags = await prisma.blogTag.findMany({
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
      orderBy: {
        postCount: 'desc',
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching blog tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog tags' },
      { status: 500 }
    );
  }
}