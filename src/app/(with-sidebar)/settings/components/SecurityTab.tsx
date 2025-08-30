'use client';

import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Using custom checkbox instead of switch
import { Label } from '@/components/ui/label';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Lock,
  Download,
  Trash2,
  Activity
} from 'lucide-react';

// Mock security data - replace with actual data
const securitySettings = {
  twoFactorEnabled: false,
  sessionTimeout: 30,
  emailNotifications: true,
  loginAlerts: true,
  dataDownloadEnabled: true,
  accountDeletionRequested: false,
  lastPasswordChange: '2023-12-15',
  activeSessions: 2
};

const recentActivity = [
  {
    id: 1,
    action: 'Login',
    location: 'New York, NY',
    device: 'Chrome on Windows',
    timestamp: '2024-01-15 10:30 AM',
    success: true
  },
  {
    id: 2,
    action: 'Settings Changed',
    location: 'New York, NY',
    device: 'Chrome on Windows',
    timestamp: '2024-01-14 3:45 PM',
    success: true
  },
  {
    id: 3,
    action: 'Failed Login',
    location: 'Unknown',
    device: 'Unknown Browser',
    timestamp: '2024-01-12 8:22 AM',
    success: false
  }
];

export default function SecurityTab() {
  const { user } = useUser();
  const [settings, setSettings] = useState(securitySettings);
  const [showSessions, setShowSessions] = useState(false);

  const handleSettingChange = (key: keyof typeof securitySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // TODO: Save to API
    console.log(`Setting ${key} changed to:`, value);
  };

  const handleChangePassword = () => {
    // Redirect to Auth0 password change
    window.location.href = '/api/auth/logout?returnTo=' + encodeURIComponent(window.location.origin + '/login?action=reset-password');
  };

  const handleEnable2FA = () => {
    // TODO: Implement 2FA setup flow
    console.log('Enable 2FA');
  };

  const handleDownloadData = () => {
    // TODO: Implement data download
    console.log('Download user data');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion flow
    console.log('Delete account');
  };

  const handleRevokeSession = (sessionId: string) => {
    // TODO: Implement session revocation
    console.log('Revoke session:', sessionId);
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              {user?.email_verified ? (
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              )}
              <h4 className="font-medium">Email Verification</h4>
              <Badge variant={user?.email_verified ? "default" : "secondary"} className="mt-1">
                {user?.email_verified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            
            <div className="text-center">
              {settings.twoFactorEnabled ? (
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              )}
              <h4 className="font-medium">Two-Factor Auth</h4>
              <Badge variant={settings.twoFactorEnabled ? "default" : "secondary"} className="mt-1">
                {settings.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium">Account Status</h4>
              <Badge variant="default" className="mt-1">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password & Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password & Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Password */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Password</h4>
                <p className="text-sm text-muted-foreground">
                  Last changed: {new Date(settings.lastPasswordChange).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" onClick={handleChangePassword}>
                Change Password
              </Button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                {settings.twoFactorEnabled ? (
                  <>
                    <Badge variant="default">Enabled</Badge>
                    <Button variant="outline" size="sm">Manage</Button>
                  </>
                ) : (
                  <Button onClick={handleEnable2FA}>Enable 2FA</Button>
                )}
              </div>
            </div>

            {/* Session Management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Active Sessions</h4>
                  <p className="text-sm text-muted-foreground">
                    You have {settings.activeSessions} active sessions
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSessions(!showSessions)}
                  className="flex items-center gap-2"
                >
                  {showSessions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSessions ? 'Hide' : 'View'} Sessions
                </Button>
              </div>
              
              {showSessions && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-muted-foreground">Chrome on Windows • New York, NY</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Mobile Session</p>
                        <p className="text-xs text-muted-foreground">Safari on iPhone • Last seen 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRevokeSession('mobile')}>
                      Revoke
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive emails about account activity and updates
                </p>
              </div>
              <input
                id="email-notifications"
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                className="rounded border-border"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="login-alerts">Login Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of new login attempts
                </p>
              </div>
              <input
                id="login-alerts"
                type="checkbox"
                checked={settings.loginAlerts}
                onChange={(e) => handleSettingChange('loginAlerts', e.target.checked)}
                className="rounded border-border"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-download">Data Download</Label>
                <p className="text-sm text-muted-foreground">
                  Allow downloading of your account data
                </p>
              </div>
              <input
                id="data-download"
                type="checkbox"
                checked={settings.dataDownloadEnabled}
                onChange={(e) => handleSettingChange('dataDownloadEnabled', e.target.checked)}
                className="rounded border-border"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after {settings.sessionTimeout} minutes of inactivity
                </p>
              </div>
              <select 
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', Number(e.target.value))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {activity.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.device} • {activity.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  <Badge variant={activity.success ? "default" : "destructive"} className="text-xs mt-1">
                    {activity.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">View All Activity</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Download Your Data</h4>
                <p className="text-sm text-muted-foreground">
                  Export all your account data and trading information
                </p>
              </div>
              <Button variant="outline" onClick={handleDownloadData}>
                <Download className="h-4 w-4 mr-2" />
                Download Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
            
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Warning:</strong> This action cannot be undone. All your trades, reports, 
                and account data will be permanently deleted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}