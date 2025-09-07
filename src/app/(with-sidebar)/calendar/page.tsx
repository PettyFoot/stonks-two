'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';

const CalendarContent = dynamic(() => import('@/components/CalendarContent'), {
  ssr: false,
  loading: () => (
    <div className="relative h-screen">
      <FullPageTriangleLoader text="Loading calendar..." />
    </div>
  )
});

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading calendar..." />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}