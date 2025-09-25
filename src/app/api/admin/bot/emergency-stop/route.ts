import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { EmergencyStopSystem } from '@/lib/bot/emergencyStop';
import { z } from 'zod';

const emergencyStopSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  confirmationCode: z.string().min(1, 'Confirmation code is required')
});

/**
 * CRITICAL EMERGENCY STOP ENDPOINT
 *
 * This endpoint must NEVER be modified once tested and working.
 * It provides the emergency stop functionality for the trading bot.
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = emergencyStopSchema.safeParse(body);

    if (!validation.success) {
      console.error('[EMERGENCY_STOP_API] Validation failed:', validation.error);
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { reason, confirmationCode } = validation.data;

    // Verify confirmation code (extra safety measure)
    const expectedCode = process.env.EMERGENCY_STOP_CODE || 'EMERGENCY_STOP_2024';
    if (confirmationCode !== expectedCode) {
      console.error(`[EMERGENCY_STOP_API] Invalid confirmation code provided by ${authResult.id}`);
      return NextResponse.json(
        { error: 'Invalid confirmation code' },
        { status: 403 }
      );
    }

    console.log(`[EMERGENCY_STOP_API] Emergency stop triggered by admin: ${authResult.email} (${authResult.id})`);
    console.log(`[EMERGENCY_STOP_API] Reason: ${reason}`);

    // Execute emergency stop
    const emergencyStop = EmergencyStopSystem.getInstance();
    const result = await emergencyStop.executeEmergencyStop(authResult.id, reason);

    // Log the result
    if (result.success) {
      console.log(`[EMERGENCY_STOP_API] ✅ Emergency stop completed successfully`);
      console.log(`[EMERGENCY_STOP_API] - Position closed: ${result.positionClosed}`);
      console.log(`[EMERGENCY_STOP_API] - Orders cancelled: ${result.ordersCancelled}`);
    } else {
      console.error(`[EMERGENCY_STOP_API] ❌ Emergency stop completed with errors:`);
      result.errors.forEach(error => console.error(`[EMERGENCY_STOP_API]   - ${error}`));
    }

    // Return result with appropriate status code
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[EMERGENCY_STOP_API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        positionClosed: 0,
        ordersCancelled: 0,
        errors: ['Emergency stop system encountered an unexpected error']
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check emergency stop status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const emergencyStop = EmergencyStopSystem.getInstance();
    const isActive = await emergencyStop.isEmergencyActive();
    const history = await emergencyStop.getEmergencyHistory(5);

    return NextResponse.json({
      isEmergencyActive: isActive,
      recentStops: history
    });

  } catch (error) {
    console.error('[EMERGENCY_STOP_API] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check emergency status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to reset emergency stop (for testing/recovery)
 * Use with extreme caution
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const emergencyStop = EmergencyStopSystem.getInstance();
    await emergencyStop.resetEmergencyStop();

    console.log(`[EMERGENCY_STOP_API] Emergency stop reset by admin: ${authResult.email}`);

    return NextResponse.json({
      success: true,
      message: 'Emergency stop reset successfully'
    });

  } catch (error) {
    console.error('[EMERGENCY_STOP_API] Error resetting emergency stop:', error);
    return NextResponse.json(
      { error: 'Failed to reset emergency stop' },
      { status: 500 }
    );
  }
}