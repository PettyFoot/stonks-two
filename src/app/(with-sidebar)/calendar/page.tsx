'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CalendarContent = dynamic(() => import('@/components/CalendarContent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading calendar...</div>
});

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading calendar...</div>}>
      <CalendarContent />
    </Suspense>
  );
}