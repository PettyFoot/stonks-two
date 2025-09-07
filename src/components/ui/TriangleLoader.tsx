'use client'

import React from 'react'
import TriangleBackground from '@/components/TriangleBackground'
import { cn } from '@/lib/utils'

interface TriangleLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'overlay' | 'inline'
  text?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

export function TriangleLoader({ 
  size = 'md', 
  variant = 'default',
  text,
  className 
}: TriangleLoaderProps) {
  const loader = (
    <div 
      className={cn(
        'relative overflow-hidden rounded-lg bg-black',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <TriangleBackground />
    </div>
  )

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2">
        {loader}
        {text && (
          <span className={cn('text-muted-foreground', textSizeClasses[size])}>
            {text}
          </span>
        )}
      </span>
    )
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          {loader}
          {text && (
            <span className={cn('text-muted-foreground', textSizeClasses[size])}>
              {text}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {loader}
      {text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )
}

// Specific loading variants for common use cases
export function PageTriangleLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <TriangleLoader size="xl" text={text} />
    </div>
  )
}

export function ButtonTriangleLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <TriangleLoader 
      size={size} 
      variant="inline" 
      className="text-current" 
    />
  )
}

export function CardTriangleLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <TriangleLoader size="lg" text={text} />
    </div>
  )
}

export function OverlayTriangleLoader({ text }: { text?: string }) {
  return <TriangleLoader variant="overlay" size="lg" text={text} />
}

// Inline triangle loader for buttons and small spaces
export function InlineTriangleLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-block bg-black rounded', sizeClasses[size])}>
      <TriangleBackground />
    </div>
  )
}