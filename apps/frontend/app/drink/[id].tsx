import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { type Drink } from '@/constants/drinks';
import { useFavorites } from '@/contexts/favorites';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { API_BASE_URL } from '@/environment';
import { getDrinkById } from '@/utils/drinks-api';
import { useSettings } from '@/contexts/settings';

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { apiBaseUrl } = useSettings();

  // Handle back navigation - if no history, go to menu
  const handleBack = useCallback(() => {
    // Check if canGoBack method exists and if we can actually go back
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      // Fallback: navigate to menu if no back history exists
      router.replace('/(tabs)/menu' as never);
    }
  }, [router]);

  const [drink, setDrink] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pouring, setPouring] = useState(false);
  const [pourSuccess, setPourSuccess] = useState(false);
  const wineIconOpacity = useRef(new Animated.Value(1)).current;
  const checkmarkIconOpacity = useRef(new Animated.Value(0)).current;
  const wineIconScale = useRef(new Animated.Value(1)).current;
  const checkmarkIconScale = useRef(new Animated.Value(0.8)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  // Fetch drink from API
  useEffect(() => {
    if (!id) return;
    
    const fetchDrink = async () => {
      try {
        setLoading(true);
        setError(null);
        setPourSuccess(false);
        wineIconOpacity.setValue(1);
        checkmarkIconOpacity.setValue(0);
        wineIconScale.setValue(1);
        checkmarkIconScale.setValue(0.8);
        buttonOpacity.setValue(1);
        const drinkData = await getDrinkById(id, apiBaseUrl);
        setDrink(drinkData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load drink';
        setError(errorMessage);
        console.error('[DrinkDetailScreen] Error fetching drink:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrink();
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, apiBaseUrl]);

  // Animate icon transition when success state changes
  useEffect(() => {
    if (pourSuccess) {
      // Fade out wine icon and fade in checkmark
      Animated.parallel([
        Animated.timing(wineIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(wineIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkIconScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade in wine icon and fade out checkmark
      Animated.parallel([
        Animated.timing(wineIconOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(wineIconScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pourSuccess]);

  // Animate button opacity when pouring state changes
  useEffect(() => {
    if (pouring) {
      // Gray out the button when pouring
      Animated.timing(buttonOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Restore full opacity when not pouring
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pouring]);

  // Reset success state after 3 seconds
  useEffect(() => {
    if (pourSuccess) {
      const timer = setTimeout(() => {
        setPourSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pourSuccess]);

  const handlePour = useCallback(async () => {
    if (!drink) return;

    try {
      setPouring(true);
      setPourSuccess(false);
      // Reset animation values immediately
      wineIconOpacity.setValue(1);
      checkmarkIconOpacity.setValue(0);
      wineIconScale.setValue(1);
      checkmarkIconScale.setValue(0.8);
      buttonOpacity.setValue(1);
      const baseUrl = apiBaseUrl || API_BASE_URL;
      const response = await fetch(`${baseUrl}/iot/pour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drink }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Backend returned ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'ok') {
        setPourSuccess(true);
        Alert.alert('Dispensing started', result.message || 'Your drink is on the way!');
      } else {
        Alert.alert('Dispense failed', result.message || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Dispense failed', error?.message ?? 'Unknown error');
    } finally {
      setPouring(false);
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink, apiBaseUrl]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFA500" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={styles.loadingText}>Loading drink...</Text>
        </View>
      </View>
    );
  }

  if (error || !drink) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFA500" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Drink not found'}</Text>
        </View>
      </View>
    );
  }

  // Use image_url from drink if available, otherwise use placeholder
  const drinkImageUrl = drink.image_url || `https://via.placeholder.com/400x300/1a1a1a/FFA500?text=${encodeURIComponent(drink.name)}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
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
            <View style={styles.instructionsContainer}>
              {(() => {
                // Handle various newline formats: \n, \\n, \r\n, etc.
                const normalized = drink.instructions
                  .replace(/\\n/g, '\n')
                  .replace(/\\r\\n/g, '\n')
                  .replace(/\\r/g, '\n');
                const lines = normalized.split(/\r?\n/);
                return lines.map((line, index) => {
                  const trimmed = line.trim();
                  // Render non-empty lines, or a spacer for empty lines
                  return trimmed ? (
                    <Text key={index} style={styles.instructionsText}>
                      {trimmed}
                    </Text>
                  ) : null;
                });
              })()}
            </View>
          </View>

          {/* Pour Button */}
          <Animated.View style={{ opacity: buttonOpacity }}>
            <TouchableOpacity
              style={[styles.pourButton, pouring && styles.pourButtonDisabled]}
              activeOpacity={0.8}
              onPress={handlePour}
              disabled={pouring}
            >
              <View style={styles.iconContainer}>
                <Animated.View
                  style={[
                    styles.iconWrapper,
                    {
                      opacity: wineIconOpacity,
                      transform: [{ scale: wineIconScale }],
                    },
                  ]}
                >
                  <Ionicons name="wine" size={24} color="#000" />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.iconWrapper,
                    styles.iconAbsolute,
                    {
                      opacity: checkmarkIconOpacity,
                      transform: [{ scale: checkmarkIconScale }],
                    },
                  ]}
                >
                  <View style={styles.checkmarkBubble}>
                    <Ionicons name="checkmark" size={20} color="#000000" />
                  </View>
                </Animated.View>
              </View>
              <Text style={styles.pourButtonText}>
                {pourSuccess ? 'Pour Successful!' : 'Pour This Drink'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
  instructionsContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 600,
  },
  instructionsText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
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
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAbsolute: {
    position: 'absolute',
  },
  checkmarkBubble: {
    backgroundColor: '#00FF00',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pourButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  pourButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 18,
    marginTop: 12,
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
