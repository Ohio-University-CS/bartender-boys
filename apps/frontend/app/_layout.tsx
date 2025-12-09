
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { FavoritesProvider } from '@/contexts/favorites';
import { NotificationsProvider } from '@/contexts/notifications';
import { NotificationContainer } from '@/components/NotificationContainer';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

function ThemedContainer({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { theme } = useSettings();
  const scheme = (theme === 'system' ? colorScheme : theme) ?? 'light';
  const statusBarStyle = scheme === 'dark' ? 'light' : 'dark';
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('@/assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('@/assets/fonts/Montserrat-Bold.ttf'),
  });
  
  // Show loading state while fonts load, but don't block rendering
  // If fonts fail to load, continue anyway (system fonts will be used)
  if (!fontsLoaded && !fontError) {
    return (
      <>
        {children}
        <NotificationContainer />
        <StatusBar style={statusBarStyle} />
      </>
    );
  }
  
  return (
    <>
      {/* Removed background image due to missing file */}
      {children}
      <NotificationContainer />
      <StatusBar style={statusBarStyle} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FavoritesProvider>
          <NotificationsProvider>
            <ThemedContainer>
              <Stack initialRouteName="auth">
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="bartender" options={{ headerShown: false }} />
                <Stack.Screen name="drink/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="conversation/[id]" options={{ headerShown: false }} />
              </Stack>
            </ThemedContainer>
          </NotificationsProvider>
        </FavoritesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
