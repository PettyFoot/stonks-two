import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth();
    
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const where: any = {};
    
    switch (filter) {
      case 'pending':
        where.adminReviewStatus = 'PENDING';
        break;
      case 'reviewed':
        where.adminReviewStatus = {
          in: ['APPROVED', 'CORRECTED', 'DISMISSED']
        };
        break;
    }

    const reviews = await prisma.aiIngestToCheck.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        brokerCsvFormat: {
          select: {
            formatName: true,
            description: true
          }
        },
        csvUploadLog: {
          select: {
            filename: true,
            originalHeaders: true,
            rowCount: true
          }
        }
      },
      orderBy: [
        {
          adminReviewStatus: 'asc' // PENDING first
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    console.error('Error fetching AI reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI reviews' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdminAuth();
    const { reviewId, adminReviewStatus, adminNotes } = await req.json();

    if (!reviewId || !adminReviewStatus) {
      return NextResponse.json(
        { error: 'Review ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['PENDING', 'IN_REVIEW', 'APPROVED', 'CORRECTED', 'DISMISSED', 'ESCALATED'];
    if (!validStatuses.includes(adminReviewStatus)) {
      return NextResponse.json(
        { error: 'Invalid review status' },
        { status: 400 }
      );
    }

    const updatedReview = await prisma.aiIngestToCheck.update({
      where: { id: reviewId },
      data: {
        adminReviewStatus,
        adminNotes,
        adminReviewedAt: new Date(),
        adminReviewedBy: user.id
      },
      select: {
        id: true,
        adminReviewStatus: true,
        adminNotes: true,
        adminReviewedAt: true
      }
    });

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    console.error('Error updating AI review:', error);
    return NextResponse.json(
      { error: 'Failed to update AI review' },
      { status: 500 }
    );
  }
}