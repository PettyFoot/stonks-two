'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send } from 'lucide-react';

interface DenialReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, message: string, assetType?: string) => void;
  isSubmitting?: boolean;
}

const DENIAL_REASONS = [
  'Not order execution data',
  'Language not supported',
  'Other'
];

const ASSET_TYPES = [
  'Stock',
  'Option',
  'Forex',
  'Futures',
  'Crypto'
];

export default function DenialReasonDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false
}: DenialReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const showAssetTypeSelector = selectedReason === 'Not order execution data';

  const handleInitialSubmit = () => {
    if (!selectedReason) return;
    if (showAssetTypeSelector && !selectedAssetType) return;
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = () => {
    onSubmit(selectedReason, message, selectedAssetType || undefined);
    // Reset state
    setSelectedReason('');
    setSelectedAssetType('');
    setMessage('');
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setSelectedReason('');
    setSelectedAssetType('');
    setMessage('');
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Deny CSV Format
              </DialogTitle>
              <DialogDescription>
                Please select a reason for denying this CSV format and optionally provide additional details.
                This information will be sent to the user via email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Denial Reason <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedReason}
                  onValueChange={setSelectedReason}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DENIAL_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showAssetTypeSelector && (
                <div className="space-y-2">
                  <Label htmlFor="assetType">
                    Asset Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedAssetType}
                    onValueChange={setSelectedAssetType}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="assetType">
                      <SelectValue placeholder="Select asset type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    This helps us provide relevant CSV format examples to the user.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">
                  Additional Message <span className="text-gray-500 text-sm">(Optional)</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Provide any additional context or explanation for the user..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  This message will be included in the email sent to the user.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleInitialSubmit}
                disabled={!selectedReason || (showAssetTypeSelector && !selectedAssetType) || isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-orange-600" />
                Confirm Denial
              </DialogTitle>
              <DialogDescription>
                Please review the denial details before sending the notification email to the user.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Denial Reason:</p>
                  <p className="text-sm text-gray-900">{selectedReason}</p>
                </div>

                {selectedAssetType && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Asset Type:</p>
                    <p className="text-sm text-gray-900">{selectedAssetType}</p>
                    <p className="text-xs text-gray-600 mt-1">User will receive {selectedAssetType.toLowerCase()} CSV format examples</p>
                  </div>
                )}

                {message && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Additional Message:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{message}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> An email will be sent to the user with the above information,
                  explaining why their CSV format cannot be supported at this time.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Sending...</span>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirm & Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
