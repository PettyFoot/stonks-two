'use client';

import { useState, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * CRITICAL: Emergency Stop Button Component
 *
 * This component must NEVER be modified once tested and working.
 * It provides the emergency stop functionality with a 3-second hold requirement.
 *
 * Features:
 * - 3-second hold requirement to prevent accidental clicks
 * - Visual progress bar during hold
 * - Confirmation dialog after successful hold
 * - Haptic feedback (on supported devices)
 * - Keyboard shortcut support (Ctrl+Shift+E)
 */

interface EmergencyStopResult {
  success: boolean;
  positionClosed: number;
  ordersCancelled: number;
  errors: string[];
}

interface EmergencyStopButtonProps {
  onEmergencyStop?: (result: EmergencyStopResult) => void;
  disabled?: boolean;
}

export function EmergencyStopButton({ onEmergencyStop, disabled = false }: EmergencyStopButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<EmergencyStopResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const holdTimer = useRef<NodeJS.Timeout>();
  const progressTimer = useRef<NodeJS.Timeout>();
  const holdStartTime = useRef<number>();

  const HOLD_DURATION = 3000; // 3 seconds
  const PROGRESS_UPDATE_INTERVAL = 50; // 50ms for smooth progress

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = undefined;
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = undefined;
    }
  }, []);

  // Start hold sequence
  const startHold = useCallback(() => {
    if (disabled || isExecuting) return;

    console.log('[EMERGENCY_STOP] Hold sequence started');
    setIsHolding(true);
    setHoldProgress(0);
    setError(null);
    holdStartTime.current = Date.now();

    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Progress update timer
    progressTimer.current = setInterval(() => {
      if (holdStartTime.current) {
        const elapsed = Date.now() - holdStartTime.current;
        const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        setHoldProgress(progress);

        if (progress >= 100) {
          clearInterval(progressTimer.current!);
        }
      }
    }, PROGRESS_UPDATE_INTERVAL);

    // Hold completion timer
    holdTimer.current = setTimeout(() => {
      console.log('[EMERGENCY_STOP] Hold completed, showing confirmation');
      setIsHolding(false);
      setHoldProgress(100);

      // Stronger haptic feedback for completion
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // Show confirmation dialog
      showConfirmationDialog();
    }, HOLD_DURATION);
  }, [disabled, isExecuting]);

  // Cancel hold sequence
  const cancelHold = useCallback(() => {
    if (!isHolding) return;

    console.log('[EMERGENCY_STOP] Hold sequence cancelled');
    clearTimers();
    setIsHolding(false);
    setHoldProgress(0);
    holdStartTime.current = undefined;
  }, [isHolding, clearTimers]);

  // Show confirmation dialog
  const showConfirmationDialog = () => {
    const confirmed = confirm(
      '🚨 EMERGENCY STOP CONFIRMATION 🚨\n\n' +
      'This will immediately:\n' +
      '• Close ALL open positions at market price\n' +
      '• Cancel ALL pending orders\n' +
      '• Disable all trading strategies\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (confirmed) {
      executeEmergencyStop();
    } else {
      setHoldProgress(0);
      console.log('[EMERGENCY_STOP] User cancelled confirmation');
    }
  };

  // Execute emergency stop
  const executeEmergencyStop = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      console.log('[EMERGENCY_STOP] Executing emergency stop...');

      const response = await fetch('/api/admin/bot/emergency-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Manual emergency stop triggered from admin panel',
          confirmationCode: process.env.NEXT_PUBLIC_EMERGENCY_STOP_CODE || 'EMERGENCY_STOP_2024'
        })
      });

      const result: EmergencyStopResult = await response.json();

      setLastResult(result);

      if (result.success) {
        console.log('[EMERGENCY_STOP] ✅ Emergency stop completed successfully');
        console.log(`[EMERGENCY_STOP] - Position closed: ${result.positionClosed}`);
        console.log(`[EMERGENCY_STOP] - Orders cancelled: ${result.ordersCancelled}`);

        // Success notification
        const message = result.positionClosed > 0 || result.ordersCancelled > 0
          ? `Emergency stop completed!\n\nPosition closed: ${result.positionClosed}\nOrders cancelled: ${result.ordersCancelled}`
          : 'Emergency stop completed successfully!\n\nNo open positions or orders found.';

        alert(`✅ ${message}`);

        // Callback for parent component
        onEmergencyStop?.(result);

        // Force page refresh to update all data
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } else {
        console.error('[EMERGENCY_STOP] ❌ Emergency stop failed');
        result.errors.forEach(error => console.error(`[EMERGENCY_STOP]   - ${error}`));

        const errorMessage = `❌ Emergency stop failed!\n\nErrors:\n${result.errors.join('\n')}`;
        setError(errorMessage);
        alert(errorMessage);
      }

    } catch (error) {
      console.error('[EMERGENCY_STOP] Network/system error:', error);
      const errorMessage = `❌ Emergency stop system error!\n\nPlease contact support immediately.\n\nError: ${error}`;
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsExecuting(false);
      setHoldProgress(0);
    }
  };

  // Keyboard shortcut handler
  const handleKeyboard = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
      event.preventDefault();
      if (!disabled && !isExecuting && !isHolding) {
        startHold();
      }
    }
  }, [disabled, isExecuting, isHolding, startHold]);

  // Setup keyboard listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyboard);
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      clearTimers();
    };
  }, [handleKeyboard, clearTimers]);

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Last result display */}
      {lastResult && !error && (
        <Alert variant={lastResult.success ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Last emergency stop: {lastResult.success ? '✅ Success' : '❌ Failed'}
            {lastResult.success && ` - Position: ${lastResult.positionClosed}, Orders: ${lastResult.ordersCancelled}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Emergency Stop Button */}
      <div className="relative">
        <Button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          disabled={disabled || isExecuting}
          className={`
            relative w-full h-20 text-white font-bold text-xl rounded-lg shadow-lg
            flex items-center justify-center gap-3 transition-all duration-200
            border-4 overflow-hidden
            ${isHolding
              ? 'bg-red-700 border-red-900 scale-95 shadow-inner'
              : 'bg-red-600 hover:bg-red-700 border-red-800 hover:scale-105 active:scale-95'
            }
            ${disabled || isExecuting
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
            }
          `}
          style={{
            background: isHolding
              ? `linear-gradient(90deg, #dc2626 ${holdProgress}%, #b91c1c ${holdProgress}%)`
              : undefined
          }}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>STOPPING...</span>
              <Loader2 className="w-8 h-8 animate-spin" />
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8" />
              <div className="flex flex-col">
                <span>{isHolding ? 'HOLD...' : 'EMERGENCY STOP'}</span>
                <span className="text-xs font-normal opacity-80">
                  {isHolding ? `${Math.ceil((HOLD_DURATION - holdProgress * HOLD_DURATION / 100) / 1000)}s` : 'Hold 3 seconds'}
                </span>
              </div>
              <AlertTriangle className="w-8 h-8" />
            </>
          )}
        </Button>

        {/* Progress indicator */}
        {isHolding && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-900">
            <div
              className="h-full bg-yellow-400 transition-all duration-75 ease-out"
              style={{ width: `${holdProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-gray-600 space-y-1">
        <p>🔥 <strong>CRITICAL:</strong> This will immediately close all positions and cancel all orders!</p>
        <p>Hold button for 3 seconds, then confirm to execute.</p>
        <p>Keyboard shortcut: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Shift+E</kbd></p>
      </div>
    </div>
  );
}

export default EmergencyStopButton;