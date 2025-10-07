import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

/**
 * API endpoint for tracking import page interactions
 *
 * SAFETY GUARANTEES:
 * - Always returns success (even on errors) to prevent client-side failures
 * - Never throws errors that would block user actions
 * - Gracefully handles missing data, auth failures, and database errors
 * - Follows same pattern as /api/tracking/page-view
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user (same pattern as page-view route)
    const user = await getCurrentUser();

    // Only track authenticated users
    // Return success anyway - don't fail tracking
    if (!user) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No authenticated user'
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      action,
      component,
      outcome,
      errorMessage,
      metadata,
      importBatchId,
      sessionId,
      timestamp
    } = body;

    // Validate required fields
    // Return success anyway - don't fail tracking
    if (!action || !component) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Missing required fields (action or component)'
      });
    }

    // Validate sessionId
    // Return success anyway - don't fail tracking
    if (!sessionId) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Missing sessionId'
      });
    }

    // Record interaction in database
    // Wrapped in try-catch for database-level errors
    await prisma.importPageInteraction.create({
      data: {
        userId: user.id,
        sessionId,
        action,
        component,
        outcome: outcome || null,
        errorMessage: errorMessage || null,
        metadata: metadata || {},
        importBatchId: importBatchId || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error but NEVER fail the request
    // This ensures tracking failures never block user actions
    console.error('Error tracking import interaction:', error);

    // Always return success to prevent client-side errors
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Database error'
    });
  }
}
