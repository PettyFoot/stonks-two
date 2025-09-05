'use client';

import React, { useState } from 'react';
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

interface BrokerInfo {
  id: string;
  name: string;
  description: string;
  features: string[];
  popular?: boolean;
  comingSoon?: boolean;
}

const SUPPORTED_BROKERS: BrokerInfo[] = [
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'Professional trading platform with global market access',
    features: ['Real-time data', 'Options & Futures', 'Global markets', 'Low fees'],
    popular: true,
  },
  {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    description: 'Commission-free trades with advanced research tools',
    features: ['Commission-free stocks', 'Advanced charts', 'Research tools', 'Options trading'],
    popular: true,
  },
  {
    id: 'charles_schwab',
    name: 'Charles Schwab',
    description: 'Full-service brokerage with investment guidance',
    features: ['No account minimums', 'Research reports', 'Investment advice', 'Global trading'],
  },
  {
    id: 'e_trade',
    name: 'E*TRADE',
    description: 'Self-directed trading with powerful tools',
    features: ['Mobile trading', 'Screeners', 'Educational resources', 'Options strategies'],
  },
  {
    id: 'fidelity',
    name: 'Fidelity',
    description: 'Long-term investing with mutual funds',
    features: ['Zero expense ratio funds', 'Retirement planning', 'Research', 'Mobile app'],
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    description: 'Commission-free trading with a simple interface',
    features: ['Commission-free', 'Fractional shares', 'Crypto trading', 'Simple interface'],
    comingSoon: true,
  },
];

enum ConnectionState {
  SELECTING = 'selecting',
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
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.SELECTING);
  const [selectedBroker, setSelectedBroker] = useState<BrokerInfo | null>(null);
  const [snapTradeData, setSnapTradeData] = useState<{
    snapTradeUserId: string;
    snapTradeUserSecret: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setConnectionState(ConnectionState.SELECTING);
    setSelectedBroker(null);
    setSnapTradeData(null);
    setError(null);
    onClose();
  };

  const handleBrokerSelect = async (broker: BrokerInfo) => {
    if (broker.comingSoon) {
      toast.info(`${broker.name} support is coming soon!`);
      return;
    }

    setSelectedBroker(broker);
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
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
        // Only accept messages from SnapTrade domain
        if (!event.origin.includes('snaptrade.com') && !event.origin.includes('localhost')) {
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
                toast.success(`Successfully connected to ${broker.name}!`);
                
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
            setConnectionState(ConnectionState.SELECTING);
            popup.close();
            break;

          case 'CLOSE_MODAL':
            console.log('User requested to close modal');
            popup.close();
            setConnectionState(ConnectionState.SELECTING);
            break;
        }
      };

      // Add message listener
      window.addEventListener('message', handleMessage);

      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          if (connectionState === ConnectionState.REDIRECTING) {
            setConnectionState(ConnectionState.SELECTING);
          }
        }
      }, 1000);

      // Cleanup function
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }, 5 * 60 * 1000); // 5 minutes timeout

    } catch (error) {
      console.error('Error connecting to broker:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to broker');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  const renderBrokerCard = (broker: BrokerInfo) => (
    <Card 
      key={broker.id}
      className={`cursor-pointer transition-all hover:shadow-md border-2 ${
        broker.comingSoon 
          ? 'border-theme-secondary-text opacity-60' 
          : 'border-theme-border hover:border-theme-tertiary'
      }`}
      onClick={() => handleBrokerSelect(broker)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-tertiary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-theme-tertiary" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-primary-text">{broker.name}</h3>
              {broker.popular && (
                <Badge variant="default" className="text-xs mt-1 bg-theme-green">
                  Popular
                </Badge>
              )}
              {broker.comingSoon && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Coming Soon
                </Badge>
              )}
            </div>
          </div>
          {!broker.comingSoon && (
            <ExternalLink className="h-4 w-4 text-theme-secondary-text" />
          )}
        </div>
        
        <p className="text-sm text-theme-secondary-text mb-3">{broker.description}</p>
        
        <div className="space-y-1">
          {broker.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-theme-green" />
              <span className="text-xs text-theme-primary-text">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionState = () => {
    switch (connectionState) {
      case ConnectionState.SELECTING:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-theme-primary-text mb-2">
                Choose Your Broker
              </h3>
              <p className="text-sm text-theme-secondary-text">
                Select your broker to connect and automatically sync your trades
              </p>
            </div>

            <div className="grid gap-4">
              {SUPPORTED_BROKERS.map(renderBrokerCard)}
            </div>

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

      case ConnectionState.CONNECTING:
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-theme-tertiary mx-auto animate-spin" />
            <h3 className="text-lg font-semibold text-theme-primary-text">
              Initializing Connection
            </h3>
            <p className="text-sm text-theme-secondary-text">
              Setting up secure connection with {selectedBroker?.name}...
            </p>
          </div>
        );

      case ConnectionState.REDIRECTING:
        return (
          <div className="text-center space-y-4">
            <div className="p-3 bg-theme-tertiary/10 rounded-full w-fit mx-auto">
              <ExternalLink className="h-8 w-8 text-theme-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary-text">
              Opening {selectedBroker?.name} Connection
            </h3>
            <p className="text-sm text-theme-secondary-text">
              A popup window will open for you to authorize the connection with {selectedBroker?.name}. 
              Please complete the authorization process in the popup window.
            </p>
            <p className="text-xs text-theme-secondary-text">
              If the popup doesn't open, please check your popup blocker settings.
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
              Setting up your connection with {selectedBroker?.name}...
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
              Your {selectedBroker?.name} account has been successfully connected. 
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
                onClick={() => setConnectionState(ConnectionState.SELECTING)}
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

        {connectionState === ConnectionState.SELECTING && (
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