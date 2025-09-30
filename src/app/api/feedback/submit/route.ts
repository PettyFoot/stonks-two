import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFeedbackToken } from '@/lib/feedback/tokens-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      token,
      question1Rating,
      question2Rating,
      question3Rating,
      question4Rating,
      question5Rating,
      comment
    } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate ratings
    const ratings = [question1Rating, question2Rating, question3Rating, question4Rating, question5Rating];
    for (const rating of ratings) {
      if (typeof rating !== 'number' || rating < 1 || rating > 10) {
        return NextResponse.json(
          { error: 'All ratings must be numbers between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Validate token
    const tokenPayload = validateFeedbackToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Invalid or expired feedback token' },
        { status: 401 }
      );
    }

    // Check if token has already been used
    const existingResponse = await prisma.feedbackResponse.findUnique({
      where: { token },
    });

    if (existingResponse) {
      return NextResponse.json(
        { error: 'This feedback form has already been submitted' },
        { status: 409 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create feedback response
    const feedbackResponse = await prisma.feedbackResponse.create({
      data: {
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email,
        question1Rating,
        question2Rating,
        question3Rating,
        question4Rating,
        question5Rating,
        comment: comment || null,
        token,
        tokenUsed: true,
      },
    });

    console.log('Feedback response created:', {
      id: feedbackResponse.id,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedbackResponse.id,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}