import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/contexts/favorites';
import { getDrinkById, type Drink } from '@/constants/drinks';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { ids, toggleFavorite, isFavorite } = useFavorites();
  const difficultyRank: Record<Drink['difficulty'], number> = {
    Hard: 0,
    Medium: 1,
    Easy: 2,
  };

  const items = ids
    .map((id) => getDrinkById(id))
    .filter((drink): drink is Drink => Boolean(drink))
    .sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.name.localeCompare(b.name));

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const metaText = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView>
      <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText type="title" colorName="tint" style={styles.title}>Favorites</ThemedText>
      </ThemedView>

      <ThemedView style={styles.list}>
        {items.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText} colorName="muted">No favorites yet</ThemedText>
            <ThemedText style={styles.emptyHelp} colorName="muted">Tap the heart on menu items to save them here.</ThemedText>
          </ThemedView>
        )}

        {items.map((drink) => (
          <ThemedView key={drink.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.rowTop}>
              <ThemedText type="defaultSemiBold" style={styles.name}>{drink.name}</ThemedText>
              <TouchableOpacity onPress={() => toggleFavorite(drink.id)}>
                <Ionicons
                  name={isFavorite(drink.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(drink.id) ? danger : mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category} colorName="tint">{drink.category}</ThemedText>
            <ThemedText style={[styles.meta, { color: metaText }]}>{drink.prepTime} • {drink.difficulty}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16 },
  emptyHelp: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
