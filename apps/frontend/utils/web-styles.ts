import { Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';

/**
 * Web-specific style utilities for better web experience
 */

export const webStyles = {
  /**
   * Adds hover effects for web
   */
  hoverable: Platform.select<ViewStyle>({
    web: {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    },
    default: {},
  }),

  /**
   * Adds focus ring for accessibility
   */
  focusable: Platform.select<ViewStyle>({
    web: {
      outline: 'none',
      transition: 'all 0.2s ease-in-out',
    },
    default: {},
  }),

  /**
   * Smooth transitions for interactive elements
   */
  transition: Platform.select<ViewStyle>({
    web: {
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    default: {},
  }),

  /**
   * Web-optimized shadow
   */
  shadow: Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),

  /**
   * Elevated shadow for cards
   */
  shadowElevated: Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),

  /**
   * Responsive container with max-width
   */
  container: Platform.select<ViewStyle>({
    web: {
      maxWidth: 1200,
      marginHorizontal: 'auto',
      width: '100%',
    },
    default: {
      width: '100%',
    },
  }),

  /**
   * Responsive content area
   */
  contentArea: Platform.select<ViewStyle>({
    web: {
      maxWidth: 800,
      marginHorizontal: 'auto',
      width: '100%',
    },
    default: {
      width: '100%',
    },
  }),

  /**
   * Smooth scroll behavior
   */
  smoothScroll: Platform.select<ViewStyle>({
    web: {
      scrollBehavior: 'smooth',
    },
    default: {},
  }),
};

/**
 * CSS-in-JS style for web hover effects
 * Use this in a style prop with Platform.select
 */
export function createHoverStyle(baseStyle: ViewStyle, hoverStyle: ViewStyle): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      ...baseStyle,
      ...webStyles.hoverable,
      ...webStyles.transition,
    };
  }
  return baseStyle;
}

/**
 * Creates a focusable style with focus ring
 */
export function createFocusableStyle(baseStyle: ViewStyle): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      ...baseStyle,
      ...webStyles.focusable,
    };
  }
  return baseStyle;
}

