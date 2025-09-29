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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: {
    id: string;
    name: string | null;
    email: string;
    subscriptionTier: string;
    _count: {
      trades: number;
      orders: number;
      importBatches: number;
    };
  } | null;
  isDeleting: boolean;
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isDeleting
}: DeleteUserModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
      setIsConfirmationValid(false);
    }
  }, [isOpen]);

  // Validate confirmation text
  useEffect(() => {
    setIsConfirmationValid(confirmationText.toLowerCase().trim() === 'delete me');
  }, [confirmationText]);

  const handleConfirm = async () => {
    if (!isConfirmationValid || isDeleting) return;
    await onConfirm();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription className="text-left">
            This action will <strong>immediately and permanently</strong> delete this user account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="space-y-2">
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

          {/* Warning List */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-medium text-red-800 mb-2">
              The following data will be permanently deleted:
            </div>
            <ul className="text-sm text-red-700 space-y-1 list-disc pl-4">
              <li>User account and profile</li>
              <li>{user._count.trades} trade records</li>
              <li>{user._count.orders} order records</li>
              <li>{user._count.importBatches} import batches</li>
              <li>Payment and subscription history</li>
              <li>All uploaded CSV files</li>
              <li>Auth0 authentication account</li>
            </ul>
          </div>

          {/* Critical Warning */}
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-800">
                  ⚠️ CRITICAL WARNING
                </div>
                <div className="text-sm text-red-700">
                  This deletion is <strong>IMMEDIATE</strong> and bypasses the normal 30-day grace period.
                  The user will lose access instantly and data cannot be recovered.
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Type <code className="bg-gray-100 px-2 py-1 rounded text-xs">delete me</code> to confirm:
            </label>
            <Input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="delete me"
              className="font-mono"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}