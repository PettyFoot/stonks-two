import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { getSnapTradeClient } from '@/lib/snaptrade/client';
import { getDecryptedSecret } from '@/lib/snaptrade/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's SnapTrade credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        snapTradeUserId: true,
        snapTradeUserSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
      return NextResponse.json({ error: 'User does not have SnapTrade credentials' }, { status: 400 });
    }

    console.log(`[SNAPTRADE_TEST] Testing connection for user ${user.email}`);

    try {
      // Decrypt the user secret
      const decryptedSecret = getDecryptedSecret(user.snapTradeUserSecret);

      console.log(`[SNAPTRADE_TEST] Credentials:`, {
        userId: user.snapTradeUserId,
        secretLength: decryptedSecret.length,
        secretStart: decryptedSecret.substring(0, 10) + '...'
      });

      // Test the connection by getting accounts
      const client = getSnapTradeClient();
      const accountsResponse = await client.accountInformation.listUserAccounts({
        userId: user.snapTradeUserId,
        userSecret: decryptedSecret,
      });

      const accounts = accountsResponse.data || [];

      console.log(`[SNAPTRADE_TEST] Success! Found ${accounts.length} accounts`);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          snapTradeUserId: user.snapTradeUserId
        },
        accounts: accounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          number: account.number,
          type: account.meta?.type || null,
          balance: account.balance,
          currency: account.balance?.currency || null,
        })),
        message: `Successfully connected to SnapTrade. Found ${accounts.length} accounts.`
      });

    } catch (snapTradeError: any) {
      console.error(`[SNAPTRADE_TEST] SnapTrade API error:`, {
        status: snapTradeError.response?.status,
        data: snapTradeError.response?.data,
        message: snapTradeError.message
      });

      return NextResponse.json({
        success: false,
        error: 'SnapTrade API error',
        details: {
          status: snapTradeError.response?.status,
          message: snapTradeError.response?.data || snapTradeError.message,
          user: {
            id: user.id,
            email: user.email,
            snapTradeUserId: user.snapTradeUserId
          }
        }
      });
    }

  } catch (error) {
    console.error('[SNAPTRADE_TEST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}