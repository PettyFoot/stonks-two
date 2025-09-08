'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, HelpCircle, User, LogOut } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showEditLayout?: boolean;
  showTimeRangeFilters?: boolean; // Deprecated - time filters moved to FilterPanel
  notification?: string;
}

export default function TopBar({ 
  title, 
  subtitle, 
  showEditLayout = false, 
  showTimeRangeFilters: _showTimeRangeFilters = false,
  notification 
}: TopBarProps) {
  return (
    <div className="bg-surface border-b border-default px-3 sm:px-6 py-3 sm:py-4">
      {/* Notification Bar */}
      {notification && (
        <div className="mb-4 rounded-lg bg-positive text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button className="text-white hover:text-secondary">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="relative flex items-center justify-center">
        {/* Title Section - Centered */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-primary">{title}</h1>
            {showEditLayout && (
              <Button variant="ghost" size="sm" className="hidden sm:flex h-7 px-2 text-muted hover:text-primary">
                <Edit className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">Edit Layout</span>
              </Button>
            )}
            {subtitle && (
              <Badge variant="secondary" className="self-start sm:self-auto sm:ml-2 bg-positive text-white hover:bg-positive text-xs sm:text-sm">
                {subtitle}
              </Badge>
            )}
          </div>
        </div>

        {/* User Menu and Help Button - Positioned Absolute Right */}
        <div className="absolute right-0 flex items-center gap-2">
          {/* Hide UserMenu on mobile - it's in the MobileNav */}
          <div className="hidden lg:block">
            <UserMenu />
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:flex text-muted hover:text-primary">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// User menu component
function UserMenu() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-primary animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
          {user.picture ? (
            <Image 
              src={user.picture} 
              alt={user.name || user.email || 'User'} 
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-surface border border-default">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/api/auth/logout" className="flex items-center">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

