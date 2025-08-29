'use client';

import { useEffect } from 'react';
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
          router.push(to);
        } else {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Starting your demo session...</p>
      </div>
    </div>
  );
}