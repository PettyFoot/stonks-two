'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser } from '@auth0/nextjs-auth0/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface BillingPreferences {
  billingAddress?: BillingAddress;
  taxId?: string;
  businessName?: string;
  emailInvoices: boolean;
  sendBillingReminders: boolean;
}

export function BillingInformationForm() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<BillingPreferences>({
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    taxId: '',
    businessName: '',
    emailInvoices: true,
    sendBillingReminders: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/billing-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading billing preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/billing-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast.success('Billing information saved successfully');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving billing preferences:', error);
      toast.error('Failed to save billing preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateBillingAddress = (field: keyof BillingAddress, value: string) => {
    setPreferences(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress!,
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Address */}
      <div>
        <h4 className="font-medium mb-4">Billing Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={preferences.billingAddress?.street || ''}
              onChange={(e) => updateBillingAddress('street', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={preferences.billingAddress?.city || ''}
              onChange={(e) => updateBillingAddress('city', e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={preferences.billingAddress?.state || ''}
              onChange={(e) => updateBillingAddress('state', e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              value={preferences.billingAddress?.zip || ''}
              onChange={(e) => updateBillingAddress('zip', e.target.value)}
              placeholder="10001"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={preferences.billingAddress?.country || ''}
              onChange={(e) => updateBillingAddress('country', e.target.value)}
              placeholder="US"
            />
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div>
        <h4 className="font-medium mb-4">Tax Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input
              id="taxId"
              value={preferences.taxId || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, taxId: e.target.value }))}
              placeholder="123-45-6789"
            />
          </div>
          <div>
            <Label htmlFor="businessName">Business Name (optional)</Label>
            <Input
              id="businessName"
              value={preferences.businessName || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="My Company LLC"
            />
          </div>
        </div>
      </div>

      {/* Invoice Preferences */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-4">Invoice Preferences</h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="emailInvoices"
              checked={preferences.emailInvoices}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, emailInvoices: checked as boolean }))
              }
            />
            <Label htmlFor="emailInvoices" className="text-sm">
              Email invoices to my account email
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendReminders"
              checked={preferences.sendBillingReminders}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, sendBillingReminders: checked as boolean }))
              }
            />
            <Label htmlFor="sendReminders" className="text-sm">
              Send billing reminders
            </Label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={savePreferences} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Billing Information
            </>
          )}
        </Button>
      </div>
    </div>
  );
}