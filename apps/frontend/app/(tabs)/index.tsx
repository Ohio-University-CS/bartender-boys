import { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
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
        <ThemedText type="title" style={styles.title}>Bartender</ThemedText>
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
            <ThemedView style={styles.drinkHeader}>
              <ThemedText type="defaultSemiBold" style={styles.drinkName}>
                {drink.name}
              </ThemedText>
              <ThemedText style={styles.prepTime}>{drink.prepTime}</ThemedText>
            </ThemedView>
            
            <ThemedText style={styles.ingredients}>
              {drink.ingredients.slice(0, 3).join(' • ')}
              {drink.ingredients.length > 3 && '...'}
            </ThemedText>
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
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    margin: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryButtonActive: {
    borderBottomColor: '#000',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#000',
    fontWeight: '500',
  },
  drinksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  drinkCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  prepTime: {
    fontSize: 12,
    color: '#999',
  },
  ingredients: {
    fontSize: 14,
    color: '#666',
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
