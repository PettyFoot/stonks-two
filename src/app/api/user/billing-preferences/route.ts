import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface BillingPreferencesRequest {
  billingAddress?: BillingAddress;
  taxId?: string;
  businessName?: string;
  emailInvoices: boolean;
  sendBillingReminders: boolean;
}

/**
 * Get user billing preferences
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user preferences from database
    const userPreferences = await prisma.userPreferences.findUnique({
      where: {
        userId: session.user.sub,
      },
    });

    // Return default preferences if none exist
    const defaultPreferences = {
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'US'
      },
      taxId: '',
      businessName: '',
      emailInvoices: true,
      sendBillingReminders: false
    };

    if (!userPreferences) {
      return NextResponse.json(defaultPreferences);
    }

    return NextResponse.json({
      billingAddress: (userPreferences.billingAddress as unknown as BillingAddress) || defaultPreferences.billingAddress,
      taxId: userPreferences.taxId || '',
      businessName: userPreferences.businessName || '',
      emailInvoices: userPreferences.emailInvoices,
      sendBillingReminders: userPreferences.sendBillingReminders
    });

  } catch (error) {
    console.error('Error fetching billing preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Save user billing preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: BillingPreferencesRequest = await request.json();

    // Validate required fields
    if (typeof body.emailInvoices !== 'boolean' || typeof body.sendBillingReminders !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Upsert user preferences
    const userPreferences = await prisma.userPreferences.upsert({
      where: {
        userId: session.user.sub,
      },
      create: {
        userId: session.user.sub,
        billingAddress: body.billingAddress as any,
        taxId: body.taxId || null,
        businessName: body.businessName || null,
        emailInvoices: body.emailInvoices,
        sendBillingReminders: body.sendBillingReminders,
      },
      update: {
        billingAddress: body.billingAddress as any,
        taxId: body.taxId || null,
        businessName: body.businessName || null,
        emailInvoices: body.emailInvoices,
        sendBillingReminders: body.sendBillingReminders,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Billing preferences saved successfully',
      preferences: {
        billingAddress: userPreferences.billingAddress as BillingAddress | null,
        taxId: userPreferences.taxId,
        businessName: userPreferences.businessName,
        emailInvoices: userPreferences.emailInvoices,
        sendBillingReminders: userPreferences.sendBillingReminders
      }
    });

  } catch (error) {
    console.error('Error saving billing preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow GET and POST requests
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}