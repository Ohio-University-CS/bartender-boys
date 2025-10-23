import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DRINKS, type Drink } from '@/constants/drinks';
import { useFavorites } from '../../contexts/favorites';
import { useSettings } from '@/contexts/settings';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';

export default function MenuScreen() {
  const { defaultMenuCategory, defaultShowFavorites } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultMenuCategory || 'All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(!!defaultShowFavorites);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    Alert.alert(
      drink.name,
      `Category: ${drink.category}\nDifficulty: ${drink.difficulty}\nPrep Time: ${drink.prepTime}\n\nIngredients:\n${drink.ingredients.join('\n')}\n\nInstructions:\n${drink.instructions}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Full Menu</ThemedText>
      </ThemedView>

      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search drinks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </ThemedView>

      <ThemedView style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={([
                styles.categoryButton,
                selectedCategory === category && [
                  styles.categoryButtonActive,
                  category !== 'All' && { borderColor: CATEGORY_COLORS[category], backgroundColor: CATEGORY_COLORS[category] },
                ],
              ]) as any}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText style={[
                styles.categoryText,
                selectedCategory === category && [styles.categoryTextActive, category !== 'All' && { color: '#0A0A0A' }]
              ]}>
                {category}
              </ThemedText>
            </TouchableOpacity>
          ))}
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
            style={styles.drinkCard}
            onPress={() => showDrinkDetails(drink)}
          >
            <View style={[styles.accentBar, { backgroundColor: CATEGORY_COLORS[drink.category] || '#FFA500' }]} />
            <View style={styles.drinkTopRow}>
              <ThemedText type="defaultSemiBold" style={styles.drinkName}>
                {drink.name}
              </ThemedText>
              <TouchableOpacity onPress={() => toggleFavorite(drink.id)}>
                <Ionicons
                  name={isFavorite(drink.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(drink.id) ? '#FF4D4D' : '#aaa'}
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category}>{drink.category}</ThemedText>

            <View style={styles.badgeRow}>
              {shownIngredients.map((ing, idx) => (
                <View key={idx} style={styles.badge}><ThemedText style={styles.badgeText}>{ing}</ThemedText></View>
              ))}
              {remaining > 0 && !isExpanded && (
                <TouchableOpacity onPress={() => toggleExpanded(drink.id)}>
                  <ThemedText style={[styles.moreText, { color: '#FFA500' }]}>+{remaining} more</ThemedText>
                </TouchableOpacity>
              )}
              {isExpanded && (
                <TouchableOpacity onPress={() => toggleExpanded(drink.id)}>
                  <ThemedText style={[styles.moreText, { color: '#FFA500' }]}>Show less</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.metaRow}>
              <ThemedText style={styles.metaText}>{drink.prepTime}</ThemedText>
              <ThemedText style={[styles.metaText, { color: DIFFICULTY_COLORS[drink.difficulty] || '#FFA500', fontWeight: '700' }]}>
                {drink.difficulty}
              </ThemedText>
            </View>
          </TouchableOpacity>
        );})}
        
        {filteredDrinks.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No drinks found</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  containerContent: {
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0C0C0C',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA500',
    textAlign: 'center',
  },
  searchContainer: {
    margin: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    width: '95%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  searchInput: {
    fontSize: 16,
    color: '#fff',
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  categoryButtonActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#FFA500',
  },
  categoryText: {
    fontSize: 14,
    color: '#aaa',
  },
  categoryTextActive: {
    color: '#FFA500',
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
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
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
    color: '#fff',
  },
  category: {
    fontSize: 13,
    color: '#FFA500',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#ddd',
    fontSize: 12,
  },
  moreText: {
    color: '#aaa',
    fontSize: 12,
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaText: {
    color: '#bbb',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
