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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Database,
  Shield,
  Trash2,
  Users
} from 'lucide-react';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: string; confirmation: boolean }) => Promise<void>;
  isLoading?: boolean;
  userEmail?: string;
}

export default function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  userEmail
}: DeleteAccountDialogProps) {
  const [reason, setReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [understands, setUnderstands] = useState({
    dataLoss: false,
    noRecovery: false,
    gracePeriod: false
  });

  const requiredConfirmationText = 'DELETE MY ACCOUNT';
  const isConfirmationValid = confirmationText === requiredConfirmationText;
  const allUnderstandingsChecked = Object.values(understands).every(Boolean);
  const canSubmit = isConfirmationValid && hasReadWarning && allUnderstandingsChecked && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      await onConfirm({
        reason: reason.trim(),
        confirmation: true
      });
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setConfirmationText('');
      setHasReadWarning(false);
      setUnderstands({
        dataLoss: false,
        noRecovery: false,
        gracePeriod: false
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete your Trade Voyager account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Account Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Account to be deleted:</span>
            </div>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>

          {/* Deletion Timeline */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              What happens when you delete your account:
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium">Immediate (Day 0)</div>
                  <p className="text-sm text-muted-foreground">
                    Account access blocked, subscriptions cancelled, deletion request logged
                  </p>
                  <Badge variant="outline" className="mt-1">Grace Period Starts</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Shield className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium">30 Days Later</div>
                  <p className="text-sm text-muted-foreground">
                    Personal data anonymized, account can no longer be reactivated
                  </p>
                  <Badge variant="outline" className="mt-1">Data Anonymized</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Database className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium">90 Days Later</div>
                  <p className="text-sm text-muted-foreground">
                    All data permanently deleted from our systems
                  </p>
                  <Badge variant="destructive" className="mt-1">Complete Deletion</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Data that will be deleted */}
          <div className="space-y-3">
            <h4 className="font-medium text-red-600 dark:text-red-400">
              The following data will be permanently deleted:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>All trading data & history</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>Reports & analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>Account settings & preferences</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>Subscription & payment history</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>Uploaded CSV files</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3 w-3" />
                <span>Trading journal entries</span>
              </div>
            </div>
          </div>

          {/* Understanding checkboxes */}
          <div className="space-y-3">
            <h4 className="font-medium">Please confirm you understand:</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={understands.dataLoss}
                  onCheckedChange={(checked) => 
                    setUnderstands(prev => ({ ...prev, dataLoss: checked as boolean }))
                  }
                  id="data-loss"
                />
                <Label htmlFor="data-loss" className="text-sm leading-relaxed">
                  I understand that all my trading data, reports, and account information will be permanently deleted after 90 days.
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  checked={understands.noRecovery}
                  onCheckedChange={(checked) => 
                    setUnderstands(prev => ({ ...prev, noRecovery: checked as boolean }))
                  }
                  id="no-recovery"
                />
                <Label htmlFor="no-recovery" className="text-sm leading-relaxed">
                  I understand that this action cannot be undone and my data cannot be recovered after the grace period ends.
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  checked={understands.gracePeriod}
                  onCheckedChange={(checked) => 
                    setUnderstands(prev => ({ ...prev, gracePeriod: checked as boolean }))
                  }
                  id="grace-period"
                />
                <Label htmlFor="grace-period" className="text-sm leading-relaxed">
                  I understand I have 30 days to reactivate my account by logging in before data is anonymized.
                </Label>
              </div>
            </div>
          </div>

          {/* Reason field */}
          <div className="space-y-2">
            <Label htmlFor="deletion-reason">
              Reason for deletion <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="deletion-reason"
              placeholder="Please tell us why you're deleting your account (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Final confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirmation-text">
              Type <code className="bg-muted px-1 py-0.5 rounded text-red-600 font-mono">
                {requiredConfirmationText}
              </code> to confirm
            </Label>
            <Input
              id="confirmation-text"
              placeholder="Type the confirmation text exactly"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isLoading}
              className={confirmationText && !isConfirmationValid ? 'border-red-500' : ''}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-red-500">
                Please type the confirmation text exactly as shown above.
              </p>
            )}
          </div>

          {/* Final warning */}
          <div className="flex items-start gap-2">
            <Checkbox
              checked={hasReadWarning}
              onCheckedChange={(checked) => setHasReadWarning(checked as boolean)}
              id="read-warning"
            />
            <Label htmlFor="read-warning" className="text-sm leading-relaxed">
              I have read and understand all the warnings above, and I want to proceed with deleting my account.
            </Label>
          </div>

          {/* ACTION BUTTONS - MOVED HERE FOR VISIBILITY */}
          <div className="p-6 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:gap-6 sm:space-y-0">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
                size="lg"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!canSubmit || isLoading}
                className="gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                size="lg"
              >
                {isLoading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </Button>
            </div>
            {!canSubmit && !isLoading && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Complete all requirements above to enable deletion
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}