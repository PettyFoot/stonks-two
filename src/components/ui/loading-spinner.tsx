'use client';

import React from 'react';
import { TriangleLoader, PageTriangleLoader, ButtonTriangleLoader, CardTriangleLoader, OverlayTriangleLoader, InlineTriangleLoader } from './TriangleLoader';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'overlay' | 'inline';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  text,
  className 
}: LoadingSpinnerProps) {
  return <TriangleLoader size={size} variant={variant} text={text} className={className} />;
}

// Specific loading spinner variants for common use cases
export function PageLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return <PageTriangleLoader text={text} />;
}

export function ButtonLoadingSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <ButtonTriangleLoader size={size} />;
}

export function CardLoadingSpinner({ text }: { text?: string }) {
  return <CardTriangleLoader text={text} />;
}

export function OverlayLoadingSpinner({ text }: { text?: string }) {
  return <OverlayTriangleLoader text={text} />;
}

// Skeleton loading components for better UX
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn('animate-pulse rounded-md bg-muted', className)}
      role="status"
      aria-label="Loading content"
    />
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <LoadingSkeleton className="h-4 w-4 rounded-full" />
          <LoadingSkeleton className="h-4 flex-1" />
          <LoadingSkeleton className="h-4 w-20" />
          <LoadingSkeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-3/4" />
        <LoadingSkeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-2">
        <LoadingSkeleton className="h-20 w-full" />
      </div>
      <div className="flex justify-between">
        <LoadingSkeleton className="h-4 w-1/4" />
        <LoadingSkeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}