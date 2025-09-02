'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { SEO_CONFIG } from '@/lib/seo';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNavigation({ items, className = '' }: BreadcrumbNavigationProps) {
  const allItems = [{ name: 'Home', url: '/' }, ...items];

  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      {allItems.map((item, index) => (
        <div key={`${item.url}-${index}`} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          {index === 0 ? (
            <Link href={item.url} className="hover:text-[var(--theme-primary)] flex items-center">
              <Home className="h-4 w-4 mr-1" />
              {item.name}
            </Link>
          ) : index === allItems.length - 1 ? (
            <span className="text-gray-800 font-medium" aria-current="page">
              {item.name}
            </span>
          ) : (
            <Link href={item.url} className="hover:text-[var(--theme-primary)]">
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

