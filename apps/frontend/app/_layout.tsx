import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { FavoritesProvider } from '@/contexts/favorites';

function ThemedContainer({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { theme } = useSettings();
  const scheme = theme === 'system' ? colorScheme : theme;
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <FavoritesProvider>
        <ThemedContainer>
          <Stack initialRouteName="auth">
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </ThemedContainer>
      </FavoritesProvider>
    </SettingsProvider>
  );
}
