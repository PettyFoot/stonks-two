'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Globe,
  Edit3,
  Save,
  X,
  Loader2
} from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  timezone?: string;
  bio?: string;
  website?: string;
}

export default function ProfileTab() {
  const { user, isLoading } = useUser();
  const { data: userProfile, loading: profileLoading } = useUserProfile();
  const { subscription } = useSubscription();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    bio: '',
    website: ''
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    setEmailError('');

    // Validate email format
    if (profile.email && !validateEmail(profile.email)) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setEmailError('Email is already in use by another account');
          toast.error('Email is already in use by another account');
        } else if (response.status === 400) {
          const errorMessage = data.details?.[0]?.message || data.error || 'Invalid request data';
          toast.error(errorMessage);
        } else {
          toast.error(data.error || 'Failed to update profile');
        }
        return;
      }

      // Success
      setIsEditing(false);

      if (data.changes?.email) {
        toast.success('Profile updated successfully! Please verify your new email address through your authentication provider.');
      } else {
        toast.success('Profile updated successfully!');
      }

    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset profile data to original values
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      bio: '',
      website: ''
    });
    setEmailError('');
    setIsEditing(false);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.picture || ''} alt={user?.name || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{user?.name || 'User'}</h3>
                  <Badge variant={subscription?.tier === SubscriptionTier.PREMIUM ? "default" : "secondary"}>
                    {subscription?.tier === SubscriptionTier.PREMIUM ? "Premium" : "Free Plan"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {userProfile?.profile?.createdAt ? new Date(userProfile.profile.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => {
                        setProfile({ ...profile, email: e.target.value });
                        if (emailError) setEmailError('');
                      }}
                      disabled={!isEditing}
                      className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                      placeholder="Email address"
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500">
                      {emailError}
                    </p>
                  )}
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Email changes will update your profile but not your authentication email. You'll need to verify through your authentication provider to change your login email.
                    </p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Changing your email will update your profile. To change your login email, you'll need to verify the new address through your authentication provider.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="timezone"
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="Your timezone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Account Created
              </Label>
              <p className="text-sm font-medium mt-1">
                {userProfile?.profile?.createdAt ? new Date(userProfile.profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Last Login
              </Label>
              <p className="text-sm font-medium mt-1">
                {userProfile?.profile?.updatedAt ? new Date(userProfile.profile.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Email Verified
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user?.email_verified ? "default" : "secondary"}>
                  {user?.email_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}