import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isHost: boolean;
};

/**
 * Authentication guard hook
 * @param requireAuth - If true, redirects to /auth if not authenticated (default: true)
 * @param requireHost - If true, redirects to /auth if user is not a host (default: false)
 */
export function useAuthGuard(requireAuth = true, requireHost = false) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Important: send cookies with request
        });
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        
        const userData = await response.json();
        setUser(userData);
        
        // Redirect if user is not a host but route requires host privileges
        if (requireHost && !userData.isHost) {
          setLocation('/auth?message=host-required');
          return;
        }
      } catch (error) {
        // Not authenticated
        if (requireAuth) {
          // Redirect to login only if authentication is required
          setLocation('/auth');
          return;
        }
        // Otherwise, just set user to null and continue
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setLocation, requireAuth, requireHost]);

  return { isChecking, user };
}