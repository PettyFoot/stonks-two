'use client';

import { useAuth } from '@/contexts/AuthContext';

export function DemoDataBadge() {
  const { isDemo } = useAuth();
  
  if (!isDemo) return null;
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
      Sample Data
    </span>
  );
}

export function DemoWatermark() {
  const { isDemo } = useAuth();
  
  if (!isDemo) return null;
  
  return (
    <div className="fixed bottom-4 right-4 pointer-events-none z-40">
      <div className="bg-black/5 text-black/20 px-3 py-1 rounded-lg text-sm font-medium">
        DEMO MODE
      </div>
    </div>
  );
}

export function DemoPageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const { isDemo } = useAuth();
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {isDemo && <DemoDataBadge />}
      </div>
      {children}
    </div>
  );
}