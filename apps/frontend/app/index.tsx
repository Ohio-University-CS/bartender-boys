import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Defaults to the menu page when opening the app
export default function Index() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'BrewBot - Home';
    }
  }, []);

  return <Redirect href="/(tabs)/menu" />;
}


