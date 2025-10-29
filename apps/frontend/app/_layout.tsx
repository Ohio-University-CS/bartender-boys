import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { FavoritesProvider } from '@/contexts/favorites';

function ThemedContainer({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { theme } = useSettings();
  const scheme = (theme === 'system' ? colorScheme : theme) ?? 'light';
  const statusBarStyle = scheme === 'dark' ? 'light' : 'dark';
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
      <StatusBar style={statusBarStyle} />
    </ThemeProvider>
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
