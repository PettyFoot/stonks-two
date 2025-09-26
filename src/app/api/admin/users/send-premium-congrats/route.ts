import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email/emailService';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch user details from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Extract first name from full name
    const getFirstName = (fullName: string | null): string => {
      if (fullName && fullName.trim()) {
        return fullName.trim().split(' ')[0];
      }
      return 'Trader';
    };

    // Prepare email data for premium welcome/congrats email
    const emailData = {
      userName: getFirstName(user.name),
      userEmail: user.email,
      subscriptionTier: user.subscriptionTier,
      trialEndDate: trialEndDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      customerPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com'}/settings`,
      supportEmail: process.env.EMAIL_FROM!,
      appUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com',
    };

    // Send premium congratulations email using existing template
    await emailService.sendSubscriptionWelcomeEmail(emailData);

    return NextResponse.json({
      success: true,
      message: 'Premium congratulations email sent successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
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
    console.error('Error sending premium congratulations email:', error);
    return NextResponse.json(
      { error: 'Failed to send premium congratulations email' },
      { status: 500 }
    );
  }
}