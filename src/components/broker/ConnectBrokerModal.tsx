'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ExternalLink, 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ConnectBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionComplete: () => void;
}


enum ConnectionState {
  CONNECTING = 'connecting',
  REDIRECTING = 'redirecting',
  COMPLETING = 'completing',
  SUCCESS = 'success',
  ERROR = 'error',
}

export default function ConnectBrokerModal({
  isOpen,
  onClose,
  onConnectionComplete
}: ConnectBrokerModalProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.CONNECTING);
  const [snapTradeData, setSnapTradeData] = useState<{
    snapTradeUserId: string;
    snapTradeUserSecret: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialConnectionCount, setInitialConnectionCount] = useState<number>(0);

  const handleClose = () => {
    setConnectionState(ConnectionState.CONNECTING);
    setSnapTradeData(null);
    setError(null);
    setInitialConnectionCount(0);
    onClose();
  };

  // Function to get current connection count
  const getCurrentConnectionCount = async (): Promise<number> => {
    try {
      const [connectionsResponse, liveConnectionsResponse] = await Promise.all([
        fetch('/api/snaptrade/connections'),
        fetch('/api/snaptrade/connections/live')
      ]);

      let totalCount = 0;

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        const filteredConnections = (connectionsData.connections || []).filter(
          (connection: any) => connection.brokerName !== 'Connection-1'
        );
        totalCount += filteredConnections.length;
      }

      if (liveConnectionsResponse.ok) {
        const liveConnectionsData = await liveConnectionsResponse.json();
        totalCount += (liveConnectionsData.connections || []).length;
      }

      return totalCount;
    } catch (error) {
      console.error('Error getting connection count:', error);
      return 0;
    }
  };

  // Polling mechanism to detect new connections
  const checkForNewConnections = async () => {
    const currentCount = await getCurrentConnectionCount();
    console.log('Checking connections - initial:', initialConnectionCount, 'current:', currentCount);
    
    if (currentCount > initialConnectionCount && initialConnectionCount > 0) {
      console.log('New connection detected, completing connection flow');
      setConnectionState(ConnectionState.SUCCESS);
      toast.success('Successfully connected to your broker!');
      
      setTimeout(() => {
        onConnectionComplete();
        handleClose();
      }, 2000);
      
      return true; // New connection detected
    }
    return false;
  };

  const initiateBrokerConnection = async () => {
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
      // Capture initial connection count
      const initialCount = await getCurrentConnectionCount();
      setInitialConnectionCount(initialCount);
      console.log('Initial connection count:', initialCount);
      // Create redirect URI for current domain
      const redirectUri = `${window.location.origin}/api/snaptrade/redirect`;

      // Initialize SnapTrade connection
      const response = await fetch('/api/snaptrade/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize connection');
      }

      // Store SnapTrade data for later use
      setSnapTradeData({
        snapTradeUserId: data.snapTradeUserId,
        snapTradeUserSecret: data.snapTradeUserSecret,
      });

      setConnectionState(ConnectionState.REDIRECTING);

      // Open SnapTrade authorization in a popup instead of redirect
      const popup = window.open(
        data.redirectUri,
        'snapTradeAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Listen for messages from the popup
      const handleMessage = async (event: MessageEvent) => {
        // Only accept messages from our own domain or localhost (for development)
        const currentOrigin = window.location.origin;
        if (event.origin !== currentOrigin && !event.origin.includes('localhost')) {
          console.log('Ignoring message from unknown origin:', event.origin);
          return;
        }

        console.log('Received message from popup:', event.data);

        switch (event.data.type) {
          case 'SUCCESS':
            setConnectionState(ConnectionState.COMPLETING);
            
            try {
              // Complete the connection using the authorization data
              const completeResponse = await fetch('/api/snaptrade/redirect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  brokerAuthorizationCode: event.data.authorizationId || 'success',
                  snapTradeUserId: data.snapTradeUserId,
                  snapTradeUserSecret: data.snapTradeUserSecret,
                }),
              });

              const completeData = await completeResponse.json();

              if (completeResponse.ok && completeData.success) {
                setConnectionState(ConnectionState.SUCCESS);
                toast.success('Successfully connected to your broker!');
                
                // Close popup and modal after a delay
                popup.close();
                setTimeout(() => {
                  onConnectionComplete();
                  handleClose();
                }, 2000);
              } else {
                throw new Error(completeData.error || 'Failed to complete connection');
              }
            } catch (completeError) {
              console.error('Error completing connection:', completeError);
              setError(completeError instanceof Error ? completeError.message : 'Failed to complete connection');
              setConnectionState(ConnectionState.ERROR);
            }
            break;

          case 'ERROR':
            console.error('SnapTrade connection error:', event.data);
            setError(event.data.error || 'Connection failed');
            setConnectionState(ConnectionState.ERROR);
            popup.close();
            break;

          case 'CLOSED':
            console.log('SnapTrade connection closed by user');
            handleClose();
            break;

          case 'CLOSE_MODAL':
            console.log('User requested to close modal');
            popup.close();
            handleClose();
            break;
        }
      };

      // Fallback polling mechanism - check for new connections and popup state every 3 seconds
      const pollForNewConnections = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollForNewConnections);
          return;
        }

        if (connectionState === ConnectionState.REDIRECTING) {
          try {
            // Check if popup URL has changed to our redirect URL (indicating completion)
            if (popup.location && popup.location.pathname === '/api/snaptrade/redirect') {
              console.log('Popup reached redirect URL, checking for new connections');
              // Give SnapTrade a moment to complete the connection
              setTimeout(async () => {
                const hasNewConnection = await checkForNewConnections();
                if (hasNewConnection) {
                  clearInterval(pollForNewConnections);
                  popup.close();
                }
              }, 2000);
            }
          } catch (crossOriginError) {
            // Can't access popup.location due to cross-origin restrictions, that's normal
            // Just check for new connections
            const hasNewConnection = await checkForNewConnections();
            if (hasNewConnection) {
              clearInterval(pollForNewConnections);
              popup.close();
            }
          }
        }
      }, 3000);

      // Add message listener
      window.addEventListener('message', handleMessage);

      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearInterval(pollForNewConnections);
          window.removeEventListener('message', handleMessage);
          
          if (connectionState === ConnectionState.REDIRECTING) {
            handleClose();
          }
        }
      }, 1000);

      // Cleanup function
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        clearInterval(pollForNewConnections);
      }, 5 * 60 * 1000); // 5 minutes timeout

    } catch (error) {
      console.error('Error connecting to broker:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to broker');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // Start connection immediately when modal opens
  useEffect(() => {
    if (isOpen && connectionState === ConnectionState.CONNECTING) {
      initiateBrokerConnection();
    }
  }, [isOpen]);


  const renderConnectionState = () => {
    switch (connectionState) {

      case ConnectionState.CONNECTING:
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-theme-tertiary mx-auto animate-spin" />
            <h3 className="text-lg font-semibold text-theme-primary-text">
              Initializing Connection
            </h3>
            <p className="text-sm text-theme-secondary-text">
              Setting up secure connection to SnapTrade...
            </p>
            <div className="p-4 bg-theme-tertiary/10 border border-theme-tertiary/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-theme-tertiary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-theme-tertiary mb-1">Secure Connection</h4>
                  <p className="text-xs text-theme-tertiary">
                    Your broker credentials are encrypted and never stored on our servers. 
                    We use SnapTrade's secure OAuth flow to establish connections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case ConnectionState.REDIRECTING:
        return (
          <div className="text-center space-y-4">
            <div className="p-3 bg-theme-tertiary/10 rounded-full w-fit mx-auto">
              <ExternalLink className="h-8 w-8 text-theme-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary-text">
              Choose Your Broker
            </h3>
            <p className="text-sm text-theme-secondary-text">
              A popup window has opened where you can select and authorize your broker connection. 
              Please complete the authorization process in the popup window.
            </p>
            <p className="text-xs text-theme-secondary-text">
              If the popup doesn't open, please check your popup blocker settings and try again.
            </p>
          </div>
        );

      case ConnectionState.COMPLETING:
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-theme-tertiary mx-auto animate-spin" />
            <h3 className="text-lg font-semibold text-theme-primary-text">
              Completing Connection
            </h3>
            <p className="text-sm text-theme-secondary-text">
              Finalizing your broker connection...
            </p>
          </div>
        );

      case ConnectionState.SUCCESS:
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-theme-green mx-auto" />
            <h3 className="text-lg font-semibold text-theme-green">
              Connection Successful!
            </h3>
            <p className="text-sm text-theme-secondary-text">
              Your broker account has been successfully connected. 
              Your trades will now be automatically synced.
            </p>
          </div>
        );

      case ConnectionState.ERROR:
        return (
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-theme-red mx-auto" />
            <h3 className="text-lg font-semibold text-theme-red">
              Connection Failed
            </h3>
            <p className="text-sm text-theme-secondary-text">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => initiateBrokerConnection()}
              >
                Try Again
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-theme-tertiary" />
            Connect Your Broker
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderConnectionState()}
        </div>

        {connectionState === ConnectionState.CONNECTING && (
          <div className="flex justify-end pt-4 border-t border-theme-border">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}