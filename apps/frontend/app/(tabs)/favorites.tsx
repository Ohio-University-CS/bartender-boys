import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/contexts/favorites';
import { getDrinkById, type Drink } from '@/constants/drinks';
import { useThemeColor } from '@/hooks/use-theme-color';

type FavoritesSortOption = 'difficulty' | 'alcohol' | 'name' | 'prepTime';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ids, toggleFavorite, isFavorite } = useFavorites();
  const [sortBy, setSortBy] = useState<FavoritesSortOption>('difficulty');

  const difficultyRank: Record<Drink['difficulty'], number> = {
    Hard: 0,
    Medium: 1,
    Easy: 2,
  };

  const sortOptions: { key: FavoritesSortOption; label: string }[] = [
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'alcohol', label: 'Alcohol Type' },
    { key: 'name', label: 'A-Z' },
    { key: 'prepTime', label: 'Prep Time' },
  ];

  const parsePrepMinutes = (prepTime: string) => {
    const parsed = parseInt(prepTime, 10);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  };

  const items = useMemo(
    () =>
      ids
        .map((id) => getDrinkById(id)).filter((drink): drink is Drink => Boolean(drink)),
    [ids]
  );

  const sortedItems = useMemo(() => {
    const data = [...items];
    const sorter = {
      difficulty: (a: Drink, b: Drink) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.name.localeCompare(b.name),
      alcohol: (a: Drink, b: Drink) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      name: (a: Drink, b: Drink) => a.name.localeCompare(b.name),
      prepTime: (a: Drink, b: Drink) => parsePrepMinutes(a.prepTime) - parsePrepMinutes(b.prepTime) || a.name.localeCompare(b.name),
    } satisfies Record<FavoritesSortOption, (a: Drink, b: Drink) => number>;
    data.sort(sorter[sortBy]);
    return data;
  }, [items, sortBy]);

  const handleOpenDrink = (drinkId: Drink['id']) => {
    router.push(`/drink/${drinkId}` as any);
  };

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const metaText = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const chipBg = useThemeColor({}, 'chipBackground');
  const chipBorder = useThemeColor({}, 'chipBorder');
  const accent = useThemeColor({}, 'tint');

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView>
      <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText type="title" colorName="tint" style={styles.title}>Favorites</ThemedText>
      </ThemedView>

      <ThemedView style={styles.sortContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContent}
        >
          {sortOptions.map((option) => {
            const isActive = sortBy === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  isActive && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setSortBy(option.key)}
              >
                <ThemedText
                  style={styles.sortText}
                  colorName={isActive ? 'onTint' : 'mutedForeground'}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ThemedView>

      <ThemedView style={styles.list}>
        {sortedItems.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText} colorName="muted">No favorites yet</ThemedText>
            <ThemedText style={styles.emptyHelp} colorName="muted">Tap the heart on menu items to save them here.</ThemedText>
          </ThemedView>
        )}

        {sortedItems.map((drink) => (
          <TouchableOpacity
            key={drink.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.85}
            onPress={() => handleOpenDrink(drink.id)}
          >
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
          </TouchableOpacity>
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
  sortContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sortContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
