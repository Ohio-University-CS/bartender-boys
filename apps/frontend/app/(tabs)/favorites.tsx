import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/contexts/favorites';
import { getDrinkById, type Drink } from '@/constants/drinks';
import { useThemeColor } from '@/hooks/use-theme-color';

type FavoritesSortOption = 'difficulty' | 'alcohol' | 'name' | 'prepTime';
const CATEGORIES = ['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy'];
const PREP_TIME_OPTIONS = [
  { key: 'any', label: 'Any Time' },
  { key: 'under2', label: '≤ 2 min', maxMinutes: 2 },
  { key: 'under3', label: '≤ 3 min', maxMinutes: 3 },
  { key: 'under4', label: '≤ 4 min', maxMinutes: 4 },
];
const INGREDIENT_COUNT_OPTIONS = [
  { key: 'any', label: 'Any Ingredients' },
  { key: 'under4', label: '≤ 4 items', maxCount: 4 },
  { key: 'under6', label: '≤ 6 items', maxCount: 6 },
  { key: 'under8', label: '≤ 8 items', maxCount: 8 },
];

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ids, toggleFavorite, isFavorite } = useFavorites();
  const [sortBy, setSortBy] = useState<FavoritesSortOption>('difficulty');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [prepTimeFilter, setPrepTimeFilter] = useState<'any' | 'under2' | 'under3' | 'under4'>('any');
  const [ingredientCountFilter, setIngredientCountFilter] = useState<'any' | 'under4' | 'under6' | 'under8'>('any');

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
    if (!prepTime) return Number.MAX_SAFE_INTEGER;
    const match = prepTime.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const items = useMemo(
    () =>
      ids
        .map((id) => getDrinkById(id)).filter((drink): drink is Drink => Boolean(drink)),
    [ids]
  );

  // Filtering logic (category, prep time, ingredient count)
  const filteredItems = useMemo(() => {
    return items.filter(drink => {
      const matchesCategory = selectedCategory === 'All' || drink.category === selectedCategory;
      const prepMinutes = parsePrepMinutes(drink.prepTime);
      const matchesPrepTime =
        prepTimeFilter === 'any' ||
        (prepTimeFilter === 'under2' && prepMinutes <= 2) ||
        (prepTimeFilter === 'under3' && prepMinutes <= 3) ||
        (prepTimeFilter === 'under4' && prepMinutes <= 4);
      const ingredientCount = drink.ingredients.length;
      const matchesIngredientCount =
        ingredientCountFilter === 'any' ||
        (ingredientCountFilter === 'under4' && ingredientCount <= 4) ||
        (ingredientCountFilter === 'under6' && ingredientCount <= 6) ||
        (ingredientCountFilter === 'under8' && ingredientCount <= 8);
      return matchesCategory && matchesPrepTime && matchesIngredientCount;
    });
  }, [items, selectedCategory, prepTimeFilter, ingredientCountFilter]);

  const sortedItems = useMemo(() => {
    const data = [...filteredItems];
    const sorter = {
      difficulty: (a: Drink, b: Drink) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.name.localeCompare(b.name),
      alcohol: (a: Drink, b: Drink) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      name: (a: Drink, b: Drink) => a.name.localeCompare(b.name),
      prepTime: (a: Drink, b: Drink) => parsePrepMinutes(a.prepTime) - parsePrepMinutes(b.prepTime) || a.name.localeCompare(b.name),
    } satisfies Record<FavoritesSortOption, (a: Drink, b: Drink) => number>;
    data.sort(sorter[sortBy]);
    return data;
  }, [filteredItems, sortBy]);

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

        {/* Category filter */}
        <ThemedView style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={[
              styles.categoriesContent,
              Platform.OS === 'web' && styles.categoriesContentWeb,
              { flexGrow: 1, justifyContent: 'center' },
            ]}
          >
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: cardBg, borderColor },
                    isActive && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <ThemedText
                    style={[styles.categoryText, isActive && styles.categoryTextActive]}
                    colorName={isActive ? 'onTint' : 'mutedForeground'}
                  >
                    {category}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ThemedView>

        {/* Prep time filter */}
        <ThemedView style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
            style={Platform.OS === 'web' ? styles.filterScrollWeb : undefined}
          >
            {PREP_TIME_OPTIONS.map((option) => {
              const isActive = prepTimeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortButton,
                    { backgroundColor: chipBg, borderColor: chipBorder },
                    isActive && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setPrepTimeFilter(option.key as any)}
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

        {/* Ingredient count filter */}
        <ThemedView style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
            style={Platform.OS === 'web' ? styles.filterScrollWeb : undefined}
          >
            {INGREDIENT_COUNT_OPTIONS.map((option) => {
              const isActive = ingredientCountFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortButton,
                    { backgroundColor: chipBg, borderColor: chipBorder },
                    isActive && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setIngredientCountFilter(option.key as any)}
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

        {/* Sort buttons */}
        <ThemedView style={[styles.sortContainer, Platform.OS === 'web' && styles.sortContainerWeb]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
            style={Platform.OS === 'web' ? styles.sortScrollWeb : undefined}
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
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    backgroundColor: undefined, // use themed color
  },
  // Category and filter styles (copied from menu.tsx for consistency)
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  categoriesScroll: {
    // No extra styles needed, but defined for parity
  },
  categoriesContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  categoriesContentWeb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 0,
  },
  filterScrollWeb: {
    alignSelf: 'center',
  },
  sortContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sortContainerWeb: {
    alignItems: 'center',
  },
  sortScrollWeb: {
    alignSelf: 'center',
  },
  sortContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  sortContentWeb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 2,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sortText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  list: { padding: 18, paddingBottom: 32 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 0.5,
  },
  // removed duplicate card style
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16 },
  emptyHelp: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
