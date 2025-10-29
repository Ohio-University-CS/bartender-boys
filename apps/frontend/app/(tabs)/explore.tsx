export const options = { href: null };
export default function Hidden() { return null; }
// Legacy file hidden from tabs; kept to avoid routing issues.
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  drinkCount: number;
  color: string;
}

const categories: Category[] = [
  {
    id: '1',
    name: 'Classic Cocktails',
    icon: 'wine',
    description: 'Timeless recipes that never go out of style',
    drinkCount: 25,
    color: '#e74c3c'
  },
  {
    id: '2',
    name: 'Whiskey Drinks',
    icon: 'flask',
    description: 'Rich and complex whiskey-based cocktails',
    drinkCount: 18,
    color: '#8b4513'
  },
  {
    id: '3',
    name: 'Tropical Drinks',
    icon: 'sunny',
    description: 'Refreshing drinks for warm weather',
    drinkCount: 22,
    color: '#f39c12'
  },
  {
    id: '4',
    name: 'Gin Cocktails',
    icon: 'leaf',
    description: 'Botanical and herbaceous gin creations',
    drinkCount: 15,
    color: '#27ae60'
  },
  {
    id: '5',
    name: 'Vodka Mixes',
    icon: 'snow',
    description: 'Clean and crisp vodka combinations',
    drinkCount: 20,
    color: '#3498db'
  },
  {
    id: '6',
    name: 'Rum Drinks',
    icon: 'boat',
    description: 'Caribbean-inspired rum cocktails',
    drinkCount: 16,
    color: '#9b59b6'
  }
];

const features = [
  {
    title: 'AI-Powered Recommendations',
    description: 'Get personalized drink suggestions based on your preferences',
    icon: 'sparkles'
  },
  {
    title: 'Ingredient Substitutions',
    description: 'Find alternatives for ingredients you don\'t have',
    icon: 'swap-horizontal'
  },
  {
    title: 'Difficulty Levels',
    description: 'Choose drinks that match your skill level',
    icon: 'trending-up'
  },
  {
    title: 'Prep Time Tracking',
    description: 'Know exactly how long each drink takes to make',
    icon: 'time'
  }
];

function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Explore</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Categories</ThemedText>
        {categories.map((category) => (
          <TouchableOpacity key={category.id} style={styles.categoryCard}>
            <ThemedView style={styles.categoryContent}>
              <ThemedText type="defaultSemiBold" style={styles.categoryName}>
                {category.name}
              </ThemedText>
              <ThemedText style={styles.drinkCount}>
                {category.drinkCount} drinks
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Features</ThemedText>
        {features.map((feature, index) => (
          <ThemedView key={index} style={styles.featureCard}>
            <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
              {feature.title}
            </ThemedText>
            <ThemedText style={styles.featureDescription}>
              {feature.description}
            </ThemedText>
          </ThemedView>
        ))}
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    color: '#000',
  },
  categoryCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  drinkCount: {
    fontSize: 12,
    color: '#999',
  },
  featureCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
});
