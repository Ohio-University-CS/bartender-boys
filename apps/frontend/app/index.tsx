import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Defaults to the menu page when opening the app, or auth if not authenticated
export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirectToAuth, setShouldRedirectToAuth] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Home';
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isVerified = await AsyncStorage.getItem('isVerified');
        const userId = await AsyncStorage.getItem('user_id');
        
        // Check if user is authenticated with valid user_id
        const isAuthenticated = isVerified === 'true' && 
                               userId && 
                               userId.trim() !== '' && 
                               userId !== 'guest';
        
        if (!isAuthenticated) {
          // Clear any invalid auth state
          await AsyncStorage.removeItem('isVerified');
          await AsyncStorage.removeItem('user_id');
          await AsyncStorage.removeItem('user_name');
          setShouldRedirectToAuth(true);
        }
      } catch (error) {
        console.error('[Index] Error checking authentication:', error);
        setShouldRedirectToAuth(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0C0C' }}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  if (shouldRedirectToAuth) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/(tabs)/menu" />;
}


