import { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, View, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DRINKS, type Drink } from '@/constants/drinks';
import { useFavorites } from '../../contexts/favorites';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { useThemeColor } from '@/hooks/use-theme-color';

type SortOption = 'difficulty' | 'alcohol' | 'name' | 'prepTime';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  // Removed hardwareOnly filter
  const { isFavorite, toggleFavorite } = useFavorites();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>('difficulty');
  const [prepTimeFilter, setPrepTimeFilter] = useState<'any' | 'under2' | 'under3' | 'under4'>('any');
  const [ingredientCountFilter, setIngredientCountFilter] = useState<'any' | 'under4' | 'under6' | 'under8'>('any');

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const badgeBg = useThemeColor({}, 'chipBackground');
  const badgeText = useThemeColor({}, 'mutedForeground');
  const metaText = useThemeColor({}, 'muted');
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const danger = useThemeColor({}, 'danger');
  const chipBg = useThemeColor({}, 'chipBackground');
  const chipBorder = useThemeColor({}, 'chipBorder');

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const categories = ['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy', 'Non-Alcoholic'];
  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'alcohol', label: 'Alcohol Type' },
    { key: 'name', label: 'A-Z' },
    { key: 'prepTime', label: 'Prep Time' },
  ];
  const prepTimeOptions: { key: typeof prepTimeFilter; label: string; maxMinutes?: number }[] = [
    { key: 'any', label: 'Any Time' },
    { key: 'under2', label: '≤ 2 min', maxMinutes: 2 },
    { key: 'under3', label: '≤ 3 min', maxMinutes: 3 },
    { key: 'under4', label: '≤ 4 min', maxMinutes: 4 },
  ];
  const ingredientCountOptions: { key: typeof ingredientCountFilter; label: string; maxCount?: number }[] = [
    { key: 'any', label: 'Any Ingredients' },
    { key: 'under4', label: '≤ 4 items', maxCount: 4 },
    { key: 'under6', label: '≤ 6 items', maxCount: 6 },
    { key: 'under8', label: '≤ 8 items', maxCount: 8 },
  ];

  const difficultyRank: Record<Drink['difficulty'], number> = {
    Hard: 0,
    Medium: 1,
    Easy: 2,
  };

  // Extracts the first number found in the prepTime string (e.g., '5 min', '10 minutes')
  const parsePrepMinutes = (prepTime: string) => {
    if (!prepTime) return Number.MAX_SAFE_INTEGER;
    const match = prepTime.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const filteredDrinks = DRINKS.filter(drink => {
    const matchesSearch = drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drink.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || drink.category === selectedCategory;
  // Removed matchesHardware
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

  return matchesSearch && matchesCategory && matchesPrepTime && matchesIngredientCount;
  });

  const sortedDrinks = useMemo(() => {
    const data = [...filteredDrinks];
    const sorter = {
      difficulty: (a: Drink, b: Drink) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.name.localeCompare(b.name),
      alcohol: (a: Drink, b: Drink) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      name: (a: Drink, b: Drink) => a.name.localeCompare(b.name),
      prepTime: (a: Drink, b: Drink) => parsePrepMinutes(a.prepTime) - parsePrepMinutes(b.prepTime) || a.name.localeCompare(b.name),
    } satisfies Record<SortOption, (a: Drink, b: Drink) => number>;

    data.sort(sorter[sortBy]);
    return data;
  }, [filteredDrinks, sortBy]);

  const showDrinkDetails = (drink: Drink) => {
    router.push(`/drink/${drink.id}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView contentContainerStyle={styles.containerContent}>
        <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText type="title" colorName="tint" style={styles.title}>Full Menu</ThemedText>
        </ThemedView>

      <ThemedView
        style={[
          styles.searchContainer,
          { borderBottomColor: borderColor, backgroundColor: inputBg, borderColor: inputBorder },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search drinks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={placeholderColor}
        />
      </ThemedView>

      <ThemedView style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={[
            styles.categoriesContent,
            Platform.OS === 'web' && styles.categoriesContentWeb
          ]}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            const customColor = category !== 'All' ? CATEGORY_COLORS[category] : accent;
            const textColorValue = isActive
              ? category !== 'All'
                ? '#FFFFFF'
                : onAccent
              : mutedForeground;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  { backgroundColor: cardBg, borderColor },
                  isActive && {
                    backgroundColor: customColor,
                    borderColor: customColor,
                  },
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <ThemedText
                  style={[styles.categoryText, isActive && styles.categoryTextActive, { color: textColorValue }]}
                >
                  {category}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ThemedView>

      <ThemedView style={[styles.filterSection, Platform.OS === 'web' && styles.filterSectionWeb]}>

        {/* Removed 'Prep time' label */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
          style={[styles.filterScroll, Platform.OS === 'web' && styles.filterScrollWeb]}
        >
          {prepTimeOptions.map((option) => {
            const isActive = prepTimeFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  isActive && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setPrepTimeFilter(option.key)}
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

        {/* Removed 'Ingredient count' label */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
          style={[styles.filterScroll, Platform.OS === 'web' && styles.filterScrollWeb]}
        >
          {ingredientCountOptions.map((option) => {
            const isActive = ingredientCountFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  isActive && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setIngredientCountFilter(option.key)}
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

      <ThemedView style={[styles.sortContainer, Platform.OS === 'web' && styles.sortContainerWeb]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.sortContent, Platform.OS === 'web' && styles.sortContentWeb]}
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

      <ThemedView style={styles.drinksContainer}>
        {sortedDrinks.map((drink) => {
          const isExpanded = !!expanded[drink.id];
          const shownIngredients = isExpanded ? drink.ingredients : drink.ingredients.slice(0, 3);
          const remaining = drink.ingredients.length - shownIngredients.length;
          return (
          <TouchableOpacity
            key={drink.id}
            style={[styles.drinkCard, { backgroundColor: cardBg, borderColor }]}
            onPress={() => showDrinkDetails(drink)}
          >
            <View style={[styles.accentBar, { backgroundColor: CATEGORY_COLORS[drink.category] || accent }]} />
            <View style={styles.drinkTopRow}>
              <ThemedText type="defaultSemiBold" style={styles.drinkName}>
                {drink.name}
              </ThemedText>
              <TouchableOpacity onPress={() => toggleFavorite(drink.id)}>
                <Ionicons
                  name={isFavorite(drink.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(drink.id) ? danger : mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category} colorName="tint">{drink.category}</ThemedText>

            <View style={styles.badgeRow}>
              {shownIngredients.map((ing, idx) => (
                <View key={idx} style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <ThemedText style={[styles.badgeText, { color: badgeText }]}>{ing}</ThemedText>
                </View>
              ))}
              {remaining > 0 && !isExpanded && (
                <TouchableOpacity onPress={() => toggleExpanded(drink.id)}>
                  <ThemedText style={styles.moreText} colorName="tint">+{remaining} more</ThemedText>
                </TouchableOpacity>
              )}
              {isExpanded && (
                <TouchableOpacity onPress={() => toggleExpanded(drink.id)}>
                  <ThemedText style={styles.moreText} colorName="tint">Show less</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.metaRow}>
              <ThemedText style={[styles.metaText, { color: metaText }]}>{drink.prepTime}</ThemedText>
              <ThemedText style={[styles.metaText, { color: DIFFICULTY_COLORS[drink.difficulty] || accent, fontWeight: '700' }]}>
                {drink.difficulty}
              </ThemedText>
            </View>
          </TouchableOpacity>
        );})}
        
        {sortedDrinks.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText} colorName="muted">No drinks found</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchContainer: {
    margin: 16,
    borderBottomWidth: 1,
    width: '95%',
    maxWidth: 680,
    alignSelf: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  categoriesContainer: {
    marginBottom: 12,
    width: '100%',
  },
  categoriesScroll: {
    paddingHorizontal: 12,
  },
  categoriesContent: {
    paddingHorizontal: 4,
  },
  categoriesContentWeb: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sortContainer: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  sortContainerWeb: {
    alignItems: 'center',
  },
  filterSection: {
    width: '100%',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 12,
  },
  filterSectionWeb: {
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterLabelWeb: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterScrollWeb: {
    alignSelf: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowWeb: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  switchWeb: {
    marginLeft: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextActive: {
    fontWeight: '600',
  },
  drinksContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    width: '95%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  drinkCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    width: '100%',
  },
  accentBar: {
    height: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  drinkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '600',
  },
  category: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 12,
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
