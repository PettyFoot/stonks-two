'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showEditLayout?: boolean;
  showTimeRangeFilters?: boolean;
  notification?: string;
}

export default function TopBar({ 
  title, 
  subtitle, 
  showEditLayout = false, 
  showTimeRangeFilters = false,
  notification 
}: TopBarProps) {
  return (
    <div className="bg-surface border-b border-default px-6 py-4">
      {/* Notification Bar */}
      {notification && (
        <div className="mb-4 rounded-lg bg-[#16A34A] text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button className="text-white hover:text-gray-200">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-primary">{title}</h1>
              {showEditLayout && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted hover:text-primary">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Layout
                </Button>
              )}
              {subtitle && (
                <Badge variant="secondary" className="ml-2 bg-[#16A34A] text-white hover:bg-[#15803d]">
                  {subtitle}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Time Range Filters */}
        {showTimeRangeFilters && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-default bg-surface">
              <Button variant="ghost" size="sm" className="rounded-l-lg rounded-r-none border-r">
                30 Days
              </Button>
              <Button variant="ghost" size="sm" className="rounded-none border-r bg-muted/10">
                60 Days
              </Button>
              <Button variant="ghost" size="sm" className="rounded-r-lg rounded-l-none">
                90 Days
              </Button>
            </div>
          </div>
        )}

        {/* Help Button */}
        <Button variant="ghost" size="sm" className="text-muted hover:text-primary">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Helper component for badge
function BadgeComponent({ children, className, variant = 'default' }: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'default' | 'secondary';
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
      variant === 'secondary' ? 'bg-gray-100 text-gray-800' : 'bg-primary text-white',
      className
    )}>
      {children}
    </span>
  );
}