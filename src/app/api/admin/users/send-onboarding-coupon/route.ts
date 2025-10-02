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
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Extract first name from full name
    const getFirstName = (fullName: string | null): string => {
      if (fullName && fullName.trim()) {
        return fullName.trim().split(' ')[0];
      }
      return 'User';
    };

    // Create app URL
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com';

    // Prepare email data
    const emailData = {
      userName: getFirstName(user.name),
      userEmail: user.email,
      supportEmail: process.env.EMAIL_FROM!,
      appUrl,
    };

    // Send onboarding with coupon email
    await emailService.sendOnboardingWithCoupon(emailData);

    return NextResponse.json({
      success: true,
      message: 'Onboarding with coupon email sent successfully',
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
    console.error('Error sending onboarding with coupon email:', error);
    return NextResponse.json(
      { error: 'Failed to send onboarding with coupon email' },
      { status: 500 }
    );
  }
}
