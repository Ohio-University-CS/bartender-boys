import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import ChatScreen from '../app/screens/ChatScreen';
import FavoritesScreen from '../app/screens/FavoritesScreen';
import SettingsScreen from '../app/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Custom tab bar icon component
const TabIcon = ({ name, focused }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.2 : 1) }],
  }));

  const getIcon = () => {
    switch (name) {
      case 'Chat':
        return '💬';
      case 'Favorites':
        return '⭐';
      case 'Settings':
        return '⚙️';
      default:
        return '•';
    }
  };

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <Text style={styles.icon}>{getIcon()}</Text>
      {focused && <View style={styles.activeIndicator} />}
    </Animated.View>
  );
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#737373',
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 119, 6, 0.2)',
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  icon: {
    fontSize: 24,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D97706',
    marginTop: 4,
  },
});