'use client';

import React, { useState, useEffect } from 'react';
import { SnapTradeReact } from 'snaptrade-react';
import { useWindowMessage } from 'snaptrade-react/hooks/useWindowMessage';
import type { ErrorData } from 'snaptrade-react';
import { toast } from 'sonner';

interface SnapTradeConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// The SnapTrade React SDK provides the ErrorData type
// Success data is passed as a string (authorizationId)

export default function SnapTradeConnector({
  isOpen,
  onClose,
  onSuccess
}: SnapTradeConnectorProps) {
  const [loginLink, setLoginLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle window messages from SnapTrade iframe
  const handleSuccess = (data: string) => {
    console.log('SnapTrade connection success:', data);
    toast.success('Successfully connected to your broker!');
    
    // Complete the connection process
    completeConnection(data || 'success');
  };

  const handleError = (data: ErrorData) => {
    console.error('SnapTrade connection error:', data);
    const errorMessage = data.detail || data.errorCode || 'Connection failed';
    toast.error(`Connection failed: ${errorMessage}`);
    setError(errorMessage);
  };

  const handleExit = () => {
    console.log('User exited SnapTrade connection flow');
    onClose();
  };

  const handleClose = () => {
    console.log('SnapTrade modal closed');
    onClose();
  };

  // Set up window message listeners
  useWindowMessage({
    handleSuccess,
    handleError,
    handleExit,
    close: handleClose,
  });

  // Complete the connection after successful authentication
  const completeConnection = async (authorizationId: string) => {
    try {
      // We don't need to do anything special here since SnapTrade automatically
      // creates the connection when the user completes the flow.
      // Just trigger our success callback to refresh the connections list.
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000); // Small delay to ensure SnapTrade has processed the connection
      
    } catch (error) {
      console.error('Error completing connection:', error);
      toast.error('Connection completed but failed to update local data');
      onClose();
    }
  };

  // Get the SnapTrade login link when component opens
  useEffect(() => {
    if (isOpen && !loginLink) {
      initializeSnapTradeConnection();
    }
  }, [isOpen]);

  const initializeSnapTradeConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create redirect URI for current domain
      const redirectUri = `${window.location.origin}/api/snaptrade/redirect`;

      // Initialize SnapTrade connection to get the login link
      const response = await fetch('/api/snaptrade/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize connection');
      }

      setLoginLink(data.redirectUri);
      console.log('SnapTrade login link generated:', data.redirectUri);

    } catch (error) {
      console.error('Error initializing SnapTrade connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize connection';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoginLink(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  if (loading || !loginLink) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-tertiary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-theme-primary-text mb-2">
              Initializing Connection
            </h3>
            <p className="text-sm text-theme-secondary-text">
              Setting up secure connection to SnapTrade...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Connection Failed
            </h3>
            <p className="text-sm text-theme-secondary-text mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={initializeSnapTradeConnection}
                className="px-4 py-2 bg-theme-tertiary text-white rounded hover:bg-theme-tertiary/90"
              >
                Try Again
              </button>
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SnapTradeReact 
      loginLink={loginLink}
      isOpen={isOpen}
      close={onClose}
    />
  );
}