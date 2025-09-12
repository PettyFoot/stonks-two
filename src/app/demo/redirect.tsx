'use client';

import { useEffect } from 'react';
import { TriangleLoader } from '@/components/ui/TriangleLoader';
import { useRouter } from 'next/navigation';

interface DemoRedirectProps {
  to: string;
}

export function DemoRedirect({ to }: DemoRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Start a demo session and redirect to the new location
    const startDemoAndRedirect = async () => {
      try {
        const response = await fetch('/api/demo/start', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Set demo mode in localStorage immediately
          if (data.setDemoMode) {
            localStorage.setItem('demo-mode', 'true');
            console.log('Set demo mode in localStorage before navigation');
          }
          
          // Add a small delay to ensure cookies are set, then use hard navigation
          await new Promise(resolve => setTimeout(resolve, 100));
          window.location.href = data.redirect || to;
        } else {
          console.error('Failed to start demo session');
          // If demo start fails, redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Error starting demo session:', error);
        router.push('/');
      }
    };

    startDemoAndRedirect();
  }, [router, to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center">
        <TriangleLoader size="lg" text="Starting your demo session..." />
      </div>
    </div>
  );
}