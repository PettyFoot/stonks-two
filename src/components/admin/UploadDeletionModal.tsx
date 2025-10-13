import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Mail, Loader2 } from 'lucide-react';

interface UploadDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { fileName: string; uploadDate: string; tradesAffected: number }) => Promise<void>;
  user: {
    id: string;
    name: string | null;
    email: string;
    subscriptionTier: string;
  } | null;
  isSending: boolean;
}

export default function UploadDeletionModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isSending
}: UploadDeletionModalProps) {
  const [fileName, setFileName] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [tradesAffected, setTradesAffected] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setUploadDate('');
      setTradesAffected('');
      setIsFormValid(false);
    }
  }, [isOpen]);

  // Validate form
  useEffect(() => {
    const isValid =
      fileName.trim() !== '' &&
      uploadDate.trim() !== '' &&
      tradesAffected.trim() !== '' &&
      !isNaN(Number(tradesAffected)) &&
      Number(tradesAffected) >= 0;
    setIsFormValid(isValid);
  }, [fileName, uploadDate, tradesAffected]);

  const handleConfirm = async () => {
    if (!isFormValid || isSending) return;

    await onConfirm({
      fileName: fileName.trim(),
      uploadDate: uploadDate.trim(),
      tradesAffected: Number(tradesAffected),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid && !isSending) {
      e.preventDefault();
      handleConfirm();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" showCloseButton={!isSending}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Mail className="h-5 w-5" />
            Send Upload Deletion Notification
          </DialogTitle>
          <DialogDescription className="text-left">
            Notify the user that their upload was deleted due to a bug. Provide details about the affected upload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-blue-800 mb-1">
                SENDING TO:
              </div>
              <div className="font-medium text-sm">
                {user.name || 'Unnamed User'}
              </div>
              <div className="text-sm text-gray-600">
                {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.subscriptionTier === 'PREMIUM' ? 'default' : 'secondary'}>
                  {user.subscriptionTier}
                </Badge>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName" className="text-sm font-medium text-gray-700">
                File Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fileName"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., trades_2024_Q1.csv"
                disabled={isSending}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uploadDate" className="text-sm font-medium text-gray-700">
                Upload Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="uploadDate"
                type="text"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., January 15, 2024"
                disabled={isSending}
              />
              <p className="text-xs text-gray-500">
                Enter in a user-friendly format (e.g., "January 15, 2024")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradesAffected" className="text-sm font-medium text-gray-700">
                Number of Trades Affected <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tradesAffected"
                type="number"
                min="0"
                value={tradesAffected}
                onChange={(e) => setTradesAffected(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 25"
                disabled={isSending}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-amber-800">
                  Email Preview
                </div>
                <div className="text-sm text-amber-700">
                  The user will receive an email explaining that their upload was deleted due to a bug,
                  with the specific details you provide above. The email will include an apology,
                  information about the fix, and an invitation to re-upload their file.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isFormValid || isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
