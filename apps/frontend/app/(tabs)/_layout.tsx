import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createThemeColors } from '@/constants/theme';
import { useSettings } from '@/contexts/settings';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { accentColor } = useSettings();
  const scheme = (colorScheme ?? 'light') as 'light' | 'dark';
  const palette = createThemeColors(accentColor)[scheme];
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
          router.replace('/auth');
        }
      } catch (error) {
        console.error('[TabLayout] Error checking authentication:', error);
        router.replace('/auth');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0C0C' }}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="menu"
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="wineglass.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bubble.left.and.bubble.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bartender-select"
        options={{
          title: 'Bartender',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gear" color={color} />,
        }}
      />
      
    </Tabs>
  );
}
