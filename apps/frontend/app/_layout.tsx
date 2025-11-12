
import { useFonts } from 'expo-font';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { FavoritesProvider } from '@/contexts/favorites';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

function ThemedContainer({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { theme } = useSettings();
  const scheme = (theme === 'system' ? colorScheme : theme) ?? 'light';
  const statusBarStyle = scheme === 'dark' ? 'light' : 'dark';
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('@/assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('@/assets/fonts/Montserrat-Bold.ttf'),
  });
  if (!fontsLoaded) return null;
  return (
    <>
      {/* Removed background image due to missing file */}
      {children}
      <StatusBar style={statusBarStyle} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FavoritesProvider>
          <ThemedContainer>
            <Stack initialRouteName="auth">
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="bartender" options={{ headerShown: false }} />
              <Stack.Screen name="drink/[id]" options={{ headerShown: false }} />
            </Stack>
          </ThemedContainer>
        </FavoritesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
