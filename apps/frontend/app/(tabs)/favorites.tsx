import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/contexts/favorites';
import { DRINKS, getDrinkById } from '@/constants/drinks';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function FavoritesScreen() {
  const { ids, toggleFavorite, isFavorite } = useFavorites();
  const items = ids.map((id) => getDrinkById(id)).filter(Boolean);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#f5f5f5', dark: '#121212' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#1f1f1f' }, 'background');
  const metaText = useThemeColor({ light: '#666', dark: '#bbb' }, 'text');
  const emptyText = useThemeColor({ light: '#999', dark: '#999' }, 'text');
  const emptyHelp = useThemeColor({ light: '#777', dark: '#777' }, 'text');

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText type="title" style={styles.title}>Favorites</ThemedText>
      </ThemedView>

      <ThemedView style={styles.list}>
        {items.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: emptyText }]}>No favorites yet</ThemedText>
            <ThemedText style={[styles.emptyHelp, { color: emptyHelp }]}>Tap the heart on menu items to save them here.</ThemedText>
          </ThemedView>
        )}

        {items.map((drink) => (
          <ThemedView key={drink!.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.rowTop}>
              <ThemedText type="defaultSemiBold" style={styles.name}>{drink!.name}</ThemedText>
              <TouchableOpacity onPress={() => toggleFavorite(drink!.id)}>
                <Ionicons
                  name={isFavorite(drink!.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(drink!.id) ? '#FF4D4D' : '#aaa'}
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category}>{drink!.category}</ThemedText>
            <ThemedText style={[styles.meta, { color: metaText }]}>{drink!.prepTime} • {drink!.difficulty}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFA500' },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13, color: '#FFA500', marginTop: 2 },
  meta: { fontSize: 12, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16 },
  emptyHelp: { fontSize: 13, marginTop: 4 },
});
