'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShareButtonProps {
  tradeId?: string;
  date?: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export default function ShareButton({ 
  tradeId, 
  date, 
  className = '',
  variant = 'icon'
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const createShare = async () => {
    if (!tradeId && !date) {
      setError('Either trade ID or date is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeId,
          date
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      setExpiresAt(data.expiresAt);
    } catch (error) {
      console.error('Share creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setError('Failed to copy to clipboard');
    }
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setShareUrl('');
      setError('');
      setCopied(false);
      setExpiresAt('');
    }
  };

  const ShareTrigger = variant === 'icon' ? (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 hover:bg-gray-100 ${className}`}
      title="Share this trade"
    >
      <Share2 className="h-4 w-4 text-gray-600" />
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 ${className}`}
    >
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {ShareTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Trade Record
          </DialogTitle>
          <DialogDescription>
            Create a secure link to share this trade record. The link will expire in 14 days.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!shareUrl && !error && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              {date 
                ? `This will share all trades and notes for ${date}`
                : 'This will share the selected trade record with execution details'
              }
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              <Clock className="h-4 w-4" />
              <div>
                <div className="font-medium">Limited time access</div>
                <div>Links expire after 14 days and you can have max 20 active shares</div>
              </div>
            </div>
          </div>
        )}

        {shareUrl && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {expiresAt && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">Link expires on:</div>
                <div>{formatExpiryDate(expiresAt)}</div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anyone with this link can view the trade record. No personal information is shared.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {!shareUrl ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createShare} 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <InlineTriangleLoader size="sm" />
                    <span className="ml-2">Creating...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Create Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsOpen(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}