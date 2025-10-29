import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DRINKS } from '@/constants/drinks';
import { useFavorites } from '@/contexts/favorites';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { API_BASE_URL } from '@/environment';

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();

  const drink = DRINKS.find(d => d.id === id);
  const [pouring, setPouring] = useState(false);

  const hardwareSteps = useMemo(() => drink?.hardwareSteps ?? null, [drink]);

  const handlePour = useCallback(async () => {
    if (!drink) return;
    if (!hardwareSteps || hardwareSteps.length === 0) {
      Alert.alert('No dispenser recipe', 'This drink has no hardware mapping yet. Configure hardwareSteps in constants/drinks.ts.');
      return;
    }

    try {
      setPouring(true);
      const response = await fetch(`${API_BASE_URL}/drinks/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: hardwareSteps, pause_between: 0.5 }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Backend returned ${response.status}`);
      }

      const result = await response.json();
      const pourSummary = Array.isArray(result?.results)
        ? result.results.map((step: any) => `${step.pump || 'pump'}: ${step.seconds ?? '?'}s`).join('\n')
        : undefined;

      Alert.alert('Dispensing started', pourSummary || 'Your drink is on the way!');
    } catch (error: any) {
      Alert.alert('Dispense failed', error?.message ?? 'Unknown error');
    } finally {
      setPouring(false);
    }
  }, [drink, hardwareSteps]);

  if (!drink) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFA500" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Drink not found</Text>
        </View>
      </View>
    );
  }

  // Placeholder image URL - you can replace with actual drink images later
  const drinkImageUrl = `https://via.placeholder.com/400x300/1a1a1a/FFA500?text=${encodeURIComponent(drink.name)}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleFavorite(drink.id)} style={styles.favoriteBtn}>
          <Ionicons
            name={isFavorite(drink.id) ? 'heart' : 'heart-outline'}
            size={28}
            color={isFavorite(drink.id) ? '#FF4D4D' : '#FFA500'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Drink Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: drinkImageUrl }}
            style={styles.drinkImage}
            defaultSource={require('@/assets/images/icon.png')}
          />
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[drink.category] || '#FFA500' }]}>
            <Text style={styles.categoryBadgeText}>{drink.category}</Text>
          </View>
        </View>

        {/* Drink Name & Info */}
        <View style={styles.content}>
          <Text style={styles.drinkName}>{drink.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#FFA500" />
              <Text style={styles.metaText}>{drink.prepTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={18} color={DIFFICULTY_COLORS[drink.difficulty] || '#FFA500'} />
              <Text style={[styles.metaText, { color: DIFFICULTY_COLORS[drink.difficulty] || '#FFA500' }]}>
                {drink.difficulty}
              </Text>
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={22} color="#FFA500" />
              <Text style={styles.sectionTitle}>Ingredients</Text>
            </View>
            <View style={styles.ingredientsList}>
              {drink.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book-outline" size={22} color="#FFA500" />
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>{drink.instructions}</Text>
          </View>

          {/* Pour Button */}
          <TouchableOpacity
            style={[styles.pourButton, pouring && styles.pourButtonDisabled]}
            activeOpacity={0.8}
            onPress={handlePour}
            disabled={pouring}
          >
            <Ionicons name="wine" size={24} color="#000" />
            <Text style={styles.pourButtonText}>{pouring ? 'Dispensing...' : 'Pour This Drink'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(12, 12, 12, 0.9)',
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FFA500',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    marginTop: 80,
  },
  drinkImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  drinkName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFA500',
    marginBottom: 16,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#eee',
    textAlign: 'center',
  },
  ingredientsList: {
    width: '100%',
    alignItems: 'center',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA500',
    marginTop: 7,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    color: '#ccc',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
  instructionsText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 600,
  },
  pourButton: {
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 32,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#FFA500',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pourButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  pourButtonDisabled: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 18,
  },
});
