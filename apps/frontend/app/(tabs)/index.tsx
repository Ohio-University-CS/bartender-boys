import { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Drink {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  instructions: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
}

const sampleDrinks: Drink[] = [
  {
    id: '1',
    name: 'Classic Margarita',
    category: 'Cocktail',
    ingredients: ['2 oz Tequila', '1 oz Lime Juice', '1 oz Triple Sec', 'Salt rim', 'Lime wedge'],
    instructions: '1. Rim glass with salt\n2. Shake all ingredients with ice\n3. Strain into glass\n4. Garnish with lime wedge',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '2',
    name: 'Old Fashioned',
    category: 'Whiskey',
    ingredients: ['2 oz Bourbon', '1 sugar cube', '2 dashes Angostura bitters', 'Orange peel', 'Ice'],
    instructions: '1. Muddle sugar cube with bitters\n2. Add bourbon and ice\n3. Stir gently\n4. Express orange peel over drink',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '3',
    name: 'Mojito',
    category: 'Rum',
    ingredients: ['2 oz White Rum', '1 oz Lime Juice', '2 tsp Sugar', '6-8 Mint leaves', 'Soda water'],
    instructions: '1. Muddle mint and sugar\n2. Add lime juice and rum\n3. Fill with ice\n4. Top with soda water\n5. Garnish with mint',
    difficulty: 'Easy',
    prepTime: '5 min'
  },
  {
    id: '4',
    name: 'Negroni',
    category: 'Gin',
    ingredients: ['1 oz Gin', '1 oz Campari', '1 oz Sweet Vermouth', 'Orange peel'],
    instructions: '1. Add all ingredients to mixing glass\n2. Add ice and stir\n3. Strain into glass\n4. Express orange peel',
    difficulty: 'Easy',
    prepTime: '2 min'
  }
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka'];

  const filteredDrinks = sampleDrinks.filter(drink => {
    const matchesSearch = drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drink.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || drink.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#666';
    }
  };

  const showDrinkDetails = (drink: Drink) => {
    Alert.alert(
      drink.name,
      `Category: ${drink.category}\nDifficulty: ${drink.difficulty}\nPrep Time: ${drink.prepTime}\n\nIngredients:\n${drink.ingredients.join('\n')}\n\nInstructions:\n${drink.instructions}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>

      <ThemedView style={styles.drinksContainer}>
        {filteredDrinks.map((drink) => (
          <TouchableOpacity
            key={drink.id}
            style={styles.drinkCard}
            onPress={() => showDrinkDetails(drink)}
          >
            <View style={styles.drinkTopRow}>
              <ThemedText type="defaultSemiBold" style={styles.drinkName}>
                {drink.name}
              </ThemedText>
              <TouchableOpacity>
                <Ionicons name="heart-outline" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category}>{drink.category}</ThemedText>

            <View style={styles.badgeRow}>
              {drink.ingredients.slice(0, 3).map((ing, idx) => (
                <View key={idx} style={styles.badge}><ThemedText style={styles.badgeText}>{ing}</ThemedText></View>
              ))}
              {drink.ingredients.length > 3 && (
                <ThemedText style={styles.moreText}>+{drink.ingredients.length - 3} more</ThemedText>
              )}
            </View>

            <View style={styles.metaRow}>
              <ThemedText style={styles.metaText}>{drink.prepTime}</ThemedText>
              <ThemedText style={[styles.metaText, { color: '#FFA500' }]}>{drink.difficulty}</ThemedText>
            </View>
          </TouchableOpacity>
        ))}
        
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
  header: {
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0C0C0C',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA500',
  },
  searchContainer: {
    margin: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchInput: {
    fontSize: 16,
    color: '#fff',
    paddingVertical: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 12,
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
  },
  drinkCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
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
