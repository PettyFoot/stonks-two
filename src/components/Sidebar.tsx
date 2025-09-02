'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
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
  Home, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Search,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Trades', href: '/trades', icon: TrendingUp },
  { name: 'Records', href: '/records', icon: BookOpen },
  { name: 'New Trade', href: '/new-trade', icon: Plus },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Automatically sync user to database when logged in
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
          
          {/* Upgrade Button - Moved here after Search */}
          {!isCollapsed ? (
            <div className="pt-4">
              <Button className="w-full bg-positive hover:bg-positive text-white rounded-lg font-medium">
                ⚡ Upgrade
              </Button>
            </div>
          ) : (
            <div className="pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="w-full p-2 bg-positive hover:bg-positive text-white rounded-lg">
                    ⚡
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-secondary text-white">
                  Upgrade
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </nav>

        {/* Import Trades Button */}
        {!isCollapsed ? (
          <div className="px-4 py-4">
            <Link href="/import">
              <Button className="w-full bg-positive hover:bg-positive text-white rounded-lg font-medium">
                📊 Import Trades
              </Button>
            </Link>
          </div>
        ) : (
          <div className="px-4 py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/import">
                  <Button className="w-full p-2 bg-positive hover:bg-positive text-white rounded-lg">
                    📊
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-secondary text-white">
                Import Trades
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-4 border-t border-white/10",
          isCollapsed && "justify-center"
        )}>
          {user ? (
            <>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={user.picture || ''} alt={user.name || ''} />
                <AvatarFallback className="bg-positive text-white">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || user.email || 'User'}
                    </p>
                    <p className="text-xs text-secondary">Plan: Free</p>
                  </div>
                  <Link 
                    href="/api/auth/logout" 
                    className="text-secondary hover:text-white transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}