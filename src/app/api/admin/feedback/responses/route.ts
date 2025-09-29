import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth();

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minRating = searchParams.get('minRating');
    const searchQuery = searchParams.get('search');

    // Build where clause
    const where: any = {};

    if (startDate && endDate) {
      where.submittedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (searchQuery) {
      where.OR = [
        { userName: { contains: searchQuery, mode: 'insensitive' } },
        { userEmail: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Fetch all feedback responses
    const feedbackResponses = await prisma.feedbackResponse.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        userName: true,
        userEmail: true,
        question1Rating: true,
        question2Rating: true,
        question3Rating: true,
        question4Rating: true,
        question5Rating: true,
        comment: true,
        submittedAt: true,
        user: {
          select: {
            subscriptionTier: true,
            subscriptionStatus: true,
          }
        }
      },
    });

    // Calculate average rating for each response
    const responsesWithAverage = feedbackResponses.map(response => {
      const avgRating = (
        response.question1Rating +
        response.question2Rating +
        response.question3Rating +
        response.question4Rating +
        response.question5Rating
      ) / 5;

      return {
        ...response,
        averageRating: Math.round(avgRating * 10) / 10,
      };
    });

    // Apply minRating filter if provided
    let filteredResponses = responsesWithAverage;
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      filteredResponses = responsesWithAverage.filter(
        response => response.averageRating >= minRatingNum
      );
    }

    // Calculate overall statistics
    const totalResponses = filteredResponses.length;
    const avgQuestion1 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + r.question1Rating, 0) / totalResponses
      : 0;
    const avgQuestion2 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + r.question2Rating, 0) / totalResponses
      : 0;
    const avgQuestion3 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + r.question3Rating, 0) / totalResponses
      : 0;
    const avgQuestion4 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + r.question4Rating, 0) / totalResponses
      : 0;
    const avgQuestion5 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + r.question5Rating, 0) / totalResponses
      : 0;
    const overallAvg = totalResponses > 0
      ? (avgQuestion1 + avgQuestion2 + avgQuestion3 + avgQuestion4 + avgQuestion5) / 5
      : 0;

    const responsesWithComments = filteredResponses.filter(r => r.comment && r.comment.trim() !== '').length;

    return NextResponse.json({
      success: true,
      responses: filteredResponses,
      stats: {
        totalResponses,
        avgQuestion1: Math.round(avgQuestion1 * 10) / 10,
        avgQuestion2: Math.round(avgQuestion2 * 10) / 10,
        avgQuestion3: Math.round(avgQuestion3 * 10) / 10,
        avgQuestion4: Math.round(avgQuestion4 * 10) / 10,
        avgQuestion5: Math.round(avgQuestion5 * 10) / 10,
        overallAvg: Math.round(overallAvg * 10) / 10,
        responsesWithComments,
      },
    });
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
    console.error('Error fetching feedback responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback responses' },
      { status: 500 }
    );
  }
}