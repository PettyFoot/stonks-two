'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSync } from '@/hooks/useUserSync';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Search,
  Settings,
  Import,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Palette,
  Shield,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/lib/themes';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Trades', href: '/trades', icon: TrendingUp },
  { name: 'Records', href: '/records', icon: BookOpen },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Import Trades', href: '/import', icon: Import },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'AI Reviews', href: '/admin/ai-reviews', icon: AlertTriangle },
  { name: 'Import History', href: '/import/history', icon: Import },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user: auth0User } = useUser();
  const { user: contextUser, isDemo, logout } = useAuth();
  const { theme: currentTheme, setTheme, availableThemes } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use the context user (which handles both Auth0 and demo users)
  const user = contextUser;
  
  // Automatically sync user to database when logged in (but not for demo)
  useUserSync();

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Theme preview helper function
  const getThemePreview = (theme: Theme) => {
    return (
      <div className="flex space-x-1">
        <div 
          className="w-3 h-3 rounded-full border border-default/20"
          style={{ backgroundColor: theme.colors.green }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-default/20"
          style={{ backgroundColor: theme.colors.red }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-default/20"
          style={{ backgroundColor: theme.colors.primary }}
        />
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "flex h-screen flex-col bg-secondary text-white transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo and Brand - Now Clickable */}
        <Link href="/dashboard" className="block">
          <div className="flex items-center justify-between px-6 py-6 hover:bg-white/5 transition-colors cursor-pointer">
            <div className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}>
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Analytics Logo" 
                width={32} 
                height={32} 
                className="rounded-lg"
              />
              {!isCollapsed && (
                <span className="text-lg font-semibold">Trade Voyager Analytics</span>
              )}
            </div>
          </div>
        </Link>

        {/* Collapse Toggle Button - Moved to top left after logo */}
        <div className="px-4 pb-4">
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center py-2 px-3 rounded-lg bg-positive hover:bg-positive text-white transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const navLink = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-secondary hover:bg-white/5 hover:text-white',
                  isCollapsed && 'justify-center'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && item.name}
              </Link>
            );

            // Wrap in tooltip when collapsed
            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-secondary text-white">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}

          {/* Admin Navigation - Only show for admin users */}
          {user?.isAdmin && (
            <>
              {!isCollapsed && (
                <div className="px-3 py-2 mt-6">
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                const navLink = (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-white/10 text-white' 
                        : 'text-secondary hover:bg-white/5 hover:text-white',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && item.name}
                  </Link>
                );

                // Wrap in tooltip when collapsed
                if (isCollapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-secondary text-white">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </>
          )}
          
        </nav>


        {/* User Profile */}
        <div className={cn(
          "border-t border-white/10",
          isCollapsed ? "px-2 py-4" : "px-4 py-4"
        )}>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-3 w-full hover:bg-white/5 rounded-lg transition-colors p-2",
                  isCollapsed && "justify-center"
                )}>
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.picture || ''} alt={user.name || ''} />
                    <AvatarFallback className={cn(
                      "text-white",
                      isDemo ? "bg-orange-500" : "bg-positive"
                    )}>
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || user.email || 'User'}
                        </p>
                        {user.isAdmin && (
                          <div className="px-1.5 py-0.5 bg-yellow-600 rounded text-xs font-medium text-white">
                            Admin
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-secondary">
                        {isDemo ? 'Demo Mode' : 'Plan: Free'}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                align={isCollapsed ? "center" : "start"} 
                className="w-56 bg-surface border border-default mb-2"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name || user.email || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    <span>Theme</span>
                    <div className="ml-auto">
                      {getThemePreview(currentTheme)}
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    {availableThemes.map((theme) => (
                      <DropdownMenuItem
                        key={theme.name}
                        onClick={() => setTheme(theme)}
                        className={`flex items-center justify-between ${
                          currentTheme.name === theme.name 
                            ? 'bg-positive/10 text-positive' 
                            : 'hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-sm">{theme.displayName}</span>
                          {currentTheme.name === theme.name && (
                            <div className="ml-2 w-2 h-2 rounded-full bg-positive" />
                          )}
                        </div>
                        {getThemePreview(theme)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={logout} className="flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  {isDemo ? "Exit Demo Mode" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Guest</p>
                    <p className="text-xs text-secondary">Not logged in</p>
                  </div>
                  <Link 
                    href="/api/auth/login" 
                    className="text-secondary hover:text-white transition-colors"
                    title="Login"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}