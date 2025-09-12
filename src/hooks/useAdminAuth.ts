import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseAdminAuthReturn {
  isAdmin: boolean | null; // null = loading, boolean = determined
  isLoading: boolean;
  user: any | null;
}

/**
 * Hook for admin authentication that safely works in client components
 * Redirects non-admin users to dashboard
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) {
        return; // Still loading auth state
      }

      if (!user) {
        router.push('/login');
        return;
      }

      // First check if we already have admin status from the session
      if (user.isAdmin !== undefined) {
        if (!user.isAdmin) {
          router.push('/dashboard');
          return;
        }
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }

      // Fallback: make API call to check admin status
      try {
        const response = await fetch('/api/auth/check-admin');
        if (response.ok) {
          const data = await response.json();
          if (!data.isAdmin) {
            router.push('/dashboard');
            return;
          }
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/dashboard');
        return;
      }

      setIsLoading(false);
    };

    checkAdminStatus();
  }, [user, authLoading, router]);

  return {
    isAdmin,
    isLoading: authLoading || isLoading,
    user
  };
}