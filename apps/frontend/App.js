import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import Toast from 'react-native-toast-message';

// Try direct require instead of import
const IDScanScreen = require('./app/screens/IDScanScreen').default;
const ChatScreen = require('./app/screens/ChatScreen').default;
const MenuScreen = require('./app/screens/MenuScreen').default;
const FavoritesScreen = require('./app/screens/FavoritesScreen').default;
const SettingsScreen = require('./app/screens/SettingsScreen').default;
const DispensingScreen = require('./app/screens/DispensingScreen').default;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main app
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: 'rgba(217, 119, 6, 0.2)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      <Tab.Screen 
        name="MenuTab" 
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📋</Text>,
        }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⭐</Text>,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
export default function App() {
  const [isVerified, setIsVerified] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isVerified ? (
          // Auth flow - Show ID Scan first
          <Stack.Screen name="IDScan">
            {(props) => (
              <IDScanScreen 
                {...props} 
                onComplete={() => setIsVerified(true)} 
              />
            )}
          </Stack.Screen>
        ) : (
          // Main app flow
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Menu" 
              component={MenuScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="Dispensing" 
              component={DispensingScreen}
              options={{
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}