import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FontFamilies } from '@/constants/theme';

interface TabHeaderProps {
  title?: string;
  rightActionButtons?: React.ReactNode;
  centerActionButtons?: React.ReactNode;
}

export function TabHeader({ title, rightActionButtons, centerActionButtons }: TabHeaderProps) {
  const borderColor = useThemeColor({}, 'border');

  return (
    <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
      {title && (
        <ThemedText type="title" colorName="tint" style={styles.title}>
          {title}
        </ThemedText>
      )}
      {centerActionButtons && (
        <View style={styles.centerActions}>
          {centerActionButtons}
        </View>
      )}
      {rightActionButtons && (
        <View style={styles.rightActions}>
          {rightActionButtons}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
    ...Platform.select({
      web: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        minWidth: '100%',
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FontFamilies.bold,
    textAlign: 'center',
    ...Platform.select({
      web: {
        fontSize: 28,
        letterSpacing: -0.5,
      },
    }),
  },
  centerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...Platform.select({
      web: {
        gap: 16,
      },
    }),
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        right: 24,
        gap: 12,
      },
    }),
  },
});

