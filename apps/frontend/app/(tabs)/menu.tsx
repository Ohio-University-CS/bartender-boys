import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DRINKS, type Drink } from '@/constants/drinks';
import { useFavorites } from '../../contexts/favorites';
import { useSettings } from '@/contexts/settings';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { defaultMenuCategory, defaultShowFavorites } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultMenuCategory || 'All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(!!defaultShowFavorites);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  // Reflect settings changes if updated while on this screen
  useEffect(() => {
    setSelectedCategory(defaultMenuCategory || 'All');
  }, [defaultMenuCategory]);
  useEffect(() => {
    setShowFavoritesOnly(!!defaultShowFavorites);
  }, [defaultShowFavorites]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const categories = ['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy', 'Non-Alcoholic'];

  const filteredDrinks = DRINKS.filter(drink => {
    const matchesSearch = drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drink.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || drink.category === selectedCategory;
    const matchesFavorite = !showFavoritesOnly || isFavorite(drink.id);
    return matchesSearch && matchesCategory && matchesFavorite;
  });

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

      <ThemedView style={styles.drinksContainer}>
        {filteredDrinks.map((drink) => {
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
        
        {filteredDrinks.length === 0 && (
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
