import { useMemo, useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, View, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabHeader } from '@/components/tab-header';
import { type Drink } from '@/constants/drinks';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDrinks, toggleFavorite as toggleFavoriteApi } from '@/utils/drinks-api';
import { useSettings } from '@/contexts/settings';
import { webStyles } from '@/utils/web-styles';

type SortOption = 'difficulty' | 'alcohol' | 'name' | 'prepTime';

const PAGE_SIZE = 20;

const difficultyRank: Record<'Hard' | 'Medium' | 'Easy', number> = {
  Hard: 0,
  Medium: 1,
  Easy: 2,
};

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiBaseUrl } = useSettings();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Menu';
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>('difficulty');
  const [prepTimeFilter, setPrepTimeFilter] = useState<'any' | 'under2' | 'under3' | 'under4'>('any');
  const [ingredientCountFilter, setIngredientCountFilter] = useState<'any' | 'under4' | 'under6' | 'under8'>('any');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // API state
  const [allDrinks, setAllDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleToggleFavorite = useCallback(async (drinkId: string) => {
    try {
      const updatedDrink = await toggleFavoriteApi(drinkId, apiBaseUrl);
      // Update the drink in the local state
      setAllDrinks(prev => prev.map(d => d.id === drinkId ? updatedDrink : d));
    } catch (err) {
      console.error('[MenuScreen] Error toggling favorite:', err);
      // Optionally show an error message to the user
    }
  }, [apiBaseUrl]);

  const categories = ['All', 'Favorites', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy'];
  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'difficulty', label: 'Difficulty' },
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

  // Fetch drinks from API
  const fetchDrinks = useCallback(async (skip: number = 0, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      
      const isFavoritesFilter = selectedCategory === 'Favorites';
      const category = selectedCategory === 'All' || isFavoritesFilter ? undefined : selectedCategory;
      const favorited = isFavoritesFilter ? true : undefined;
      
      const response = await getDrinks(
        {
          skip,
          limit: PAGE_SIZE,
          category,
          favorited,
        },
        apiBaseUrl
      );
      
      if (reset) {
        setAllDrinks(response.drinks);
      } else {
        setAllDrinks(prev => [...prev, ...response.drinks]);
      }
      
      setHasMore(response.has_more);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch drinks';
      setError(errorMessage);
      console.error('[MenuScreen] Error fetching drinks:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, apiBaseUrl]);

  // Initial load and when category changes
  useEffect(() => {
    fetchDrinks(0, true);
  }, [fetchDrinks]);

  // Extracts the first number found in the prepTime string (e.g., '5 min', '10 minutes')
  const parsePrepMinutes = (prepTime: string) => {
    if (!prepTime) return Number.MAX_SAFE_INTEGER;
    const match = prepTime.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return Number.MAX_SAFE_INTEGER;
  };

  // Client-side filtering for search, prep time, and ingredient count
  const filteredDrinks = useMemo(() => {
    return allDrinks.filter(drink => {
      const matchesSearch = searchQuery === '' || 
        drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drink.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
      
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

      // When Favorites filter is selected, only show favorited drinks
      const matchesFavorites = selectedCategory !== 'Favorites' || drink.favorited;

      return matchesSearch && matchesPrepTime && matchesIngredientCount && matchesFavorites;
    });
  }, [allDrinks, searchQuery, prepTimeFilter, ingredientCountFilter, selectedCategory]);

  const sortedItems = useMemo(() => {
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

  const showDrinkDetails = useCallback((drink: Drink) => {
    router.push(`/drink/${drink.id}` as any);
  }, [router]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchDrinks(allDrinks.length, false);
    }
  }, [loadingMore, hasMore, loading, allDrinks.length, fetchDrinks]);

  const renderDrinkItem = useCallback(({ item: drink }: { item: Drink }) => {
    const isExpanded = !!expanded[drink.id];
    const shownIngredients = isExpanded ? drink.ingredients : drink.ingredients.slice(0, 3);
    const remaining = drink.ingredients.length - shownIngredients.length;
    const drinkImageUrl = drink.image_url || `https://via.placeholder.com/120x120/1a1a1a/FFA500?text=${encodeURIComponent(drink.name.substring(0, 2))}`;
    
    return (
      <TouchableOpacity
        style={[
          styles.drinkCard, 
          { backgroundColor: cardBg, borderColor },
          webStyles.hoverable,
          webStyles.shadow,
        ]}
        onPress={() => showDrinkDetails(drink)}
      >
        <View style={styles.drinkCardContent}>
          <View style={styles.drinkImageContainer}>
            <Image
              source={{ uri: drinkImageUrl }}
              style={styles.drinkImage}
              defaultSource={require('@/assets/images/icon.png')}
            />
          </View>
          <View style={styles.drinkDetails}>
            <View style={styles.drinkTopRow}>
              <View style={styles.drinkNameContainer}>
                <ThemedText type="defaultSemiBold" style={styles.drinkName} numberOfLines={2}>
                  {drink.name}
                </ThemedText>
                <ThemedText style={styles.category} colorName="tint">{drink.category}</ThemedText>
              </View>
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(drink.id);
                }}
                style={[webStyles.hoverable, webStyles.transition]}
              >
                <Ionicons
                  name={drink.favorited ? 'heart' : 'heart-outline'}
                  size={20}
                  color={drink.favorited ? danger : mutedForeground}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.badgeRow}>
              {shownIngredients.map((ing, idx) => (
                <View key={idx} style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <ThemedText style={[styles.badgeText, { color: badgeText }]}>{ing}</ThemedText>
                </View>
              ))}
              {remaining > 0 && !isExpanded && (
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  toggleExpanded(drink.id);
                }}>
                  <ThemedText style={styles.moreText} colorName="tint">+{remaining} more</ThemedText>
                </TouchableOpacity>
              )}
              {isExpanded && (
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  toggleExpanded(drink.id);
                }}>
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
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [expanded, cardBg, borderColor, accent, danger, mutedForeground, badgeBg, badgeText, metaText, handleToggleFavorite, showDrinkDetails, toggleExpanded]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={accent} />
      </View>
    );
  }, [loadingMore, accent]);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.containerContent}>
        <TabHeader 
          title="Full Menu" 
          rightActionButtons={
            <TouchableOpacity
              onPress={() => setShowFilterMenu(true)}
              style={styles.filterButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
            </TouchableOpacity>
          }
        />

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

      <ThemedView style={styles.toggleButtonsContainer}>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: cardBg, borderColor },
              selectedCategory === 'All' && { backgroundColor: accent, borderColor: accent },
              webStyles.hoverable,
              webStyles.transition,
            ]}
            onPress={() => setSelectedCategory('All')}
          >
            <ThemedText
              style={[styles.toggleButtonText, { color: selectedCategory === 'All' ? onAccent : mutedForeground }]}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: cardBg, borderColor },
              selectedCategory === 'Favorites' && { backgroundColor: accent, borderColor: accent },
              webStyles.hoverable,
              webStyles.transition,
            ]}
            onPress={() => setSelectedCategory('Favorites')}
          >
            <ThemedText
              style={[styles.toggleButtonText, { color: selectedCategory === 'Favorites' ? onAccent : mutedForeground }]}
            >
              Favorites
            </ThemedText>
          </TouchableOpacity>
        </View>
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
          {categories.filter(cat => cat !== 'All' && cat !== 'Favorites').map((category) => {
            const isActive = selectedCategory === category;
            const customColor = CATEGORY_COLORS[category] || accent;
            const textColorValue = isActive ? '#FFFFFF' : mutedForeground;
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
                  webStyles.hoverable,
                  webStyles.transition,
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

      <Modal
        visible={showFilterMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <ThemedView
            style={[styles.filterMenu, { backgroundColor: cardBg, borderColor }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.filterMenuHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="defaultSemiBold" style={styles.filterMenuTitle}>Filters</ThemedText>
              <TouchableOpacity
                onPress={() => setShowFilterMenu(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterMenuContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterMenuSection}>
                <ThemedText style={styles.filterMenuLabel} colorName="mutedForeground">Sort By</ThemedText>
                <View style={styles.filterOptions}>
                  {sortOptions.map((option) => {
                    const isActive = sortBy === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.filterOption,
                          { backgroundColor: chipBg, borderColor: chipBorder },
                          isActive && { backgroundColor: accent, borderColor: accent },
                          webStyles.hoverable,
                          webStyles.transition,
                        ]}
                        onPress={() => setSortBy(option.key)}
                      >
                        <ThemedText
                          style={styles.filterOptionText}
                          colorName={isActive ? 'onTint' : 'mutedForeground'}
                        >
                          {option.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterMenuSection}>
                <ThemedText style={styles.filterMenuLabel} colorName="mutedForeground">Prep Time</ThemedText>
                <View style={styles.filterOptions}>
                  {prepTimeOptions.map((option) => {
                    const isActive = prepTimeFilter === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.filterOption,
                          { backgroundColor: chipBg, borderColor: chipBorder },
                          isActive && { backgroundColor: accent, borderColor: accent },
                          webStyles.hoverable,
                          webStyles.transition,
                        ]}
                        onPress={() => setPrepTimeFilter(option.key)}
                      >
                        <ThemedText
                          style={styles.filterOptionText}
                          colorName={isActive ? 'onTint' : 'mutedForeground'}
                        >
                          {option.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterMenuSection}>
                <ThemedText style={styles.filterMenuLabel} colorName="mutedForeground">Ingredient Count</ThemedText>
                <View style={styles.filterOptions}>
                  {ingredientCountOptions.map((option) => {
                    const isActive = ingredientCountFilter === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.filterOption,
                          { backgroundColor: chipBg, borderColor: chipBorder },
                          isActive && { backgroundColor: accent, borderColor: accent },
                          webStyles.hoverable,
                          webStyles.transition,
                        ]}
                        onPress={() => setIngredientCountFilter(option.key)}
                      >
                        <ThemedText
                          style={styles.filterOptionText}
                          colorName={isActive ? 'onTint' : 'mutedForeground'}
                        >
                          {option.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </ThemedView>
        </TouchableOpacity>
      </Modal>

        {loading && allDrinks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <ThemedText style={styles.loadingText} colorName="muted">Loading drinks...</ThemedText>
          </View>
        ) : error ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText} colorName="danger">{error}</ThemedText>
            <TouchableOpacity onPress={() => fetchDrinks(0, true)} style={styles.retryButton}>
              <ThemedText colorName="tint">Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <FlatList
            data={sortedItems}
            renderItem={renderDrinkItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.drinksContainer}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyText} colorName="muted">No drinks found</ThemedText>
              </ThemedView>
            }
            scrollEnabled={true}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  containerContent: {
    flex: 1,
    alignItems: 'center',
    ...Platform.select({
      web: {
        maxWidth: 1200,
        width: '100%',
        marginHorizontal: 'auto',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
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
  filterToggleContainer: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  filterToggleContainerWeb: {
    alignItems: 'center',
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterToggleIcon: {
    marginLeft: 2,
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
    ...Platform.select({
      web: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
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
    ...Platform.select({
      web: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
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
  filterButton: {
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  toggleButtonsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 12,
    ...Platform.select({
      web: {
        paddingHorizontal: 24,
      },
    }),
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        paddingVertical: 14,
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  drinkCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    width: '100%',
    ...Platform.select({
      web: {
        borderRadius: 18,
        padding: 14,
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
      },
    }),
  },
  drinkCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  drinkImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    ...Platform.select({
      web: {
        width: 120,
        height: 120,
      },
    }),
  },
  drinkImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  drinkDetails: {
    flex: 1,
    gap: 8,
  },
  drinkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  drinkNameContainer: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterMenu: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderRadius: 18,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      },
      default: {
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
    }),
  },
  filterMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  filterMenuContent: {
    padding: 16,
  },
  filterMenuSection: {
    marginBottom: 24,
  },
  filterMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
