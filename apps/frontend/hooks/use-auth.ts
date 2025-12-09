import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook to check if user is authenticated with a valid user_id
 * Redirects to auth page if not authenticated
 */
export function useAuth(redirectIfUnauthenticated: boolean = true) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isVerified = await AsyncStorage.getItem('isVerified');
        const userId = await AsyncStorage.getItem('user_id');
        
        // User is authenticated if isVerified is true AND user_id exists and is valid
        const authenticated = isVerified === 'true' && 
                             userId && 
                             userId.trim() !== '' && 
                             userId !== 'guest';
        
        setIsAuthenticated(authenticated);
        
        if (!authenticated && redirectIfUnauthenticated) {
          // Clear any invalid auth state
          await AsyncStorage.removeItem('isVerified');
          await AsyncStorage.removeItem('user_id');
          await AsyncStorage.removeItem('user_name');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('[useAuth] Error checking authentication:', error);
        setIsAuthenticated(false);
        if (redirectIfUnauthenticated) {
          router.replace('/auth');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, redirectIfUnauthenticated]);

  return { isAuthenticated, isChecking };
}

