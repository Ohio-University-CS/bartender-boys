import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Bartender theme gradient: deep whiskey brown to bottle green
// Adjust colors here if you want a different vibe
const GRADIENT_COLORS = ['#1a0e05', '#2a1508', '#0a2a1f'];

export function GradientBackground({ children }: { children: React.ReactNode }) {
  // Some environments may lack proper TS typings for expo-linear-gradient; cast to any for JSX usage.
  const LG: any = LinearGradient as any;
  return (
    <View style={styles.container}>
      <LG
        colors={GRADIENT_COLORS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
