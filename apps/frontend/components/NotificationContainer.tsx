import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications, type Notification } from '@/contexts/notifications';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  // Type-specific colors
  const getTypeColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: '#10B981', // green-500
          accentColor: '#10B981',
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          iconColor: '#EF4444', // red-500
          accentColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: '#F59E0B', // amber-500
          accentColor: '#F59E0B',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          iconColor: '#3B82F6', // blue-500
          accentColor: '#3B82F6',
        };
    }
  };

  const { icon, iconColor, accentColor } = getTypeColors();

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    // Slide out animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor,
          borderColor,
          marginTop: insets.top + 8,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <Ionicons name={icon} size={24} color={iconColor} style={styles.icon} />
        <ThemedText style={[styles.message, { color: textColor }]} numberOfLines={3}>
          {notification.message}
        </ThemedText>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={mutedForeground} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function NotificationContainer() {
  const { notifications, dismissNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        pointerEvents: 'none',
      },
    }),
  },
  notification: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  icon: {
    marginRight: 4,
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 4,
  },
});

