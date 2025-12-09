import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Animated, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { type Drink } from '@/constants/drinks';
import { useFavorites } from '@/contexts/favorites';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/ui-palette';
import { API_BASE_URL } from '@/environment';
import { getDrinkById, deleteDrink, toggleFavorite as toggleFavoriteApi } from '@/utils/drinks-api';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toggleFavorite: toggleFavoriteContext } = useFavorites();
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
  const [pourFail, setPourFail] = useState(false);
  const [canPour, setCanPour] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const wineIconOpacity = useRef(new Animated.Value(1)).current;
  const checkmarkIconOpacity = useRef(new Animated.Value(0)).current;
  const xIconOpacity = useRef(new Animated.Value(0)).current;
  const wineIconScale = useRef(new Animated.Value(1)).current;
  const checkmarkIconScale = useRef(new Animated.Value(0.8)).current;
  const xIconScale = useRef(new Animated.Value(0.8)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  // Helper function to normalize ingredient names to snake_case (matching backend logic)
  const normalizeToSnakeCase = useCallback((text: string): string => {
    if (!text) return '';
    // Convert to lowercase and replace spaces/special chars with underscores
    let normalized = text.toLowerCase().trim();
    // Replace spaces and special characters with underscores
    normalized = normalized.replace(/[^\w\s-]/g, '');
    normalized = normalized.replace(/[\s-]+/g, '_');
    // Remove leading/trailing underscores
    normalized = normalized.replace(/^_+|_+$/g, '');
    return normalized;
  }, []);

  // Check if drink ingredients are available in pump config
  const checkIngredientAvailability = useCallback(async (drinkData: Drink) => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        // If no user_id, allow pouring (might be guest mode)
        setCanPour(true);
        return;
      }

      const baseUrl = apiBaseUrl || API_BASE_URL;
      const response = await fetch(`${baseUrl}/iot/pump-config?user_id=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        // If pump config fetch fails, allow pouring (don't block on errors)
        setCanPour(true);
        return;
      }

      const config = await response.json();
      
      // Get available ingredients from pumps
      const availableIngredients = new Set<string>();
      if (config.pump1) availableIngredients.add(config.pump1);
      if (config.pump2) availableIngredients.add(config.pump2);
      if (config.pump3) availableIngredients.add(config.pump3);

      // If no pumps are configured, allow pouring (might be intentional)
      if (availableIngredients.size === 0) {
        setCanPour(true);
        return;
      }

      // Normalize drink ingredients to snake_case and check availability
      const drinkIngredients = drinkData.ingredients || [];
      const missingIngredients: string[] = [];

      for (const ingredient of drinkIngredients) {
        const normalizedIngredient = normalizeToSnakeCase(ingredient);
        if (!availableIngredients.has(normalizedIngredient)) {
          missingIngredients.push(ingredient);
        }
      }

      // Disable button if any ingredients are missing
      setCanPour(missingIngredients.length === 0);
    } catch (error) {
      console.error('Failed to check ingredient availability:', error);
      // On error, allow pouring (don't block on validation errors)
      setCanPour(true);
    }
  }, [apiBaseUrl, normalizeToSnakeCase]);

  // Set document title
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (drink) {
        document.title = `${drink.name}`;
      } else {
        document.title = 'Drink';
      }
    }
  }, [drink]);

  // Fetch drink from API
  useEffect(() => {
    if (!id) return;
    
    const fetchDrink = async () => {
      try {
        setLoading(true);
        setError(null);
        setPourSuccess(false);
        setPourFail(false);
        setCanPour(true); // Reset to true while loading
        wineIconOpacity.setValue(1);
        checkmarkIconOpacity.setValue(0);
        xIconOpacity.setValue(0);
        wineIconScale.setValue(1);
        checkmarkIconScale.setValue(0.8);
        xIconScale.setValue(0.8);
        buttonOpacity.setValue(1);
        // Get user_id from AsyncStorage
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        
        const drinkData = await getDrinkById(id, userId, apiBaseUrl);
        setDrink(drinkData);
        // Check ingredient availability after drink is loaded
        await checkIngredientAvailability(drinkData);
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
  }, [id, apiBaseUrl, checkIngredientAvailability]);

  // Animate icon transition when success or fail state changes
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
        Animated.timing(xIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkIconScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(xIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (pourFail) {
      // Fade out wine icon and fade in X icon
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
        Animated.timing(xIconOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(xIconScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade in wine icon and fade out checkmark/X
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
        Animated.timing(xIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(xIconScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pourSuccess, pourFail]);

  // Animate button opacity when pouring state or canPour state changes
  useEffect(() => {
    if (pouring || !canPour) {
      // Gray out the button when pouring or when ingredients are unavailable
      Animated.timing(buttonOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Restore full opacity when not pouring and ingredients are available
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pouring, canPour]);

  // Reset success state after 3 seconds
  useEffect(() => {
    if (pourSuccess) {
      const timer = setTimeout(() => {
        setPourSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pourSuccess]);

  // Reset fail state after 3 seconds
  useEffect(() => {
    if (pourFail) {
      const timer = setTimeout(() => {
        setPourFail(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pourFail]);

  const handlePour = useCallback(async () => {
    if (!drink) return;

    try {
      setPouring(true);
      setPourSuccess(false);
      setPourFail(false);
      // Reset animation values immediately
      wineIconOpacity.setValue(1);
      checkmarkIconOpacity.setValue(0);
      xIconOpacity.setValue(0);
      wineIconScale.setValue(1);
      checkmarkIconScale.setValue(0.8);
      xIconScale.setValue(0.8);
      buttonOpacity.setValue(1);
      
      // Get user_id from AsyncStorage
      let userId: string | null = null;
      try {
        userId = await AsyncStorage.getItem('user_id');
      } catch (error) {
        console.error('Failed to get user_id from AsyncStorage:', error);
      }
      
      const baseUrl = apiBaseUrl || API_BASE_URL;
      const response = await fetch(`${baseUrl}/iot/pour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          drink,
          user_id: userId || undefined,
        }),
      });

      if (!response.ok) {
        // Try to parse error response as JSON first
        let errorMessage = `Backend returned ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If JSON parsing fails, try text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.status === 'ok') {
        setPourSuccess(true);
        Alert.alert('Dispensing started', result.message || 'Your drink is on the way!');
      } else {
        // Handle error status from backend (e.g., missing ingredients)
        setPourFail(true);
        Alert.alert('Dispense failed', result.message || 'Unknown error');
      }
    } catch (error: any) {
      // Display user-friendly error message
      const errorMessage = error?.message ?? 'Unknown error occurred';
      setPourFail(true);
      Alert.alert('Dispense failed', errorMessage);
    } finally {
      setPouring(false);
    }
    // Animation refs are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink, apiBaseUrl]);

  const handleToggleFavorite = useCallback(async (drinkId: string) => {
    if (!drink) return;
    
    try {
      // Get user_id from AsyncStorage
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        console.error('[DrinkDetailScreen] No user_id found, cannot toggle favorite');
        return;
      }
      
      // Optimistically update the UI immediately
      const currentFavorited = drink.favorited;
      const newFavoritedState = !currentFavorited;
      setDrink(prev => prev ? { ...prev, favorited: newFavoritedState } : null);
      toggleFavoriteContext(drinkId); // Also update the favorites context
      
      // Call the API in the background
      try {
        const updatedDrink = await toggleFavoriteApi(drinkId, userId, apiBaseUrl);
        // Update with the actual response (in case server has different state)
        setDrink(updatedDrink);
      } catch (apiError) {
        // Revert the optimistic update on error
        console.error('[DrinkDetailScreen] Error toggling favorite:', apiError);
        setDrink(prev => prev ? { ...prev, favorited: currentFavorited } : null);
        toggleFavoriteContext(drinkId); // Revert the context too
        // Optionally show an error message to the user
      }
    } catch (err) {
      console.error('[DrinkDetailScreen] Error in handleToggleFavorite:', err);
    }
  }, [drink, apiBaseUrl, toggleFavoriteContext]);

  const handleDelete = useCallback(() => {
    if (!drink) return;
    setShowDeleteModal(true);
  }, [drink]);

  const confirmDelete = useCallback(async () => {
    if (!drink) return;
    
    try {
      setDeleting(true);
      // Get user_id from AsyncStorage
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        setDeleting(false);
        setShowDeleteModal(false);
        return;
      }
      
      await deleteDrink(drink.id, userId, apiBaseUrl);
      setShowDeleteModal(false);
      
      // Navigate back to menu
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/menu' as never);
      }
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to delete drink';
      Alert.alert('Error', errorMessage);
      setDeleting(false);
    }
  }, [drink, apiBaseUrl, router]);

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

  // Use image_data (base64) if available, otherwise use image_url
  // On mobile, prefer image_data to avoid network issues
  let drinkImageUrl: string;
  if (drink.image_data) {
    // Use base64 data URI directly - works everywhere, no network needed
    drinkImageUrl = drink.image_data;
  } else if (drink.image_url) {
    // On mobile, avoid URLs with 127.0.0.1 (won't work)
    if (Platform.OS !== 'web' && drink.image_url.includes('127.0.0.1')) {
      // On mobile with 127.0.0.1 URL, use placeholder instead
      drinkImageUrl = `https://via.placeholder.com/400x300/1a1a1a/FFA500?text=${encodeURIComponent(drink.name)}`;
    } else {
      // Handle relative URLs and fix absolute URLs with 127.0.0.1
      drinkImageUrl = drink.image_url;
      if (apiBaseUrl) {
        // If it's a relative URL (starts with /), prepend API base URL
        if (drinkImageUrl.startsWith('/')) {
          const correctBaseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
          drinkImageUrl = `${correctBaseUrl}${drinkImageUrl}`;
        }
        // If it contains 127.0.0.1, replace with correct API base URL
        else if (drinkImageUrl.includes('127.0.0.1')) {
          const correctBaseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
          drinkImageUrl = drinkImageUrl.replace(/http:\/\/127\.0\.0\.1:\d+/, correctBaseUrl);
        }
      }
    }
  } else {
    // Fallback to placeholder
    drinkImageUrl = `https://via.placeholder.com/400x300/1a1a1a/FFA500?text=${encodeURIComponent(drink.name)}`;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => handleToggleFavorite(drink.id)} style={styles.favoriteBtn}>
            <Ionicons
              name={drink.favorited ? 'heart' : 'heart-outline'}
              size={28}
              color={drink.favorited ? '#FF4D4D' : '#FFA500'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons
              name="trash-outline"
              size={24}
              color="#FF4D4D"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContent}>
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
              {drink.ingredients.map((ingredient, index) => {
                const ratio = drink.ratios && drink.ratios[index] !== undefined 
                  ? drink.ratios[index] 
                  : null;
                return (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.ingredientText}>
                      {ingredient}
                      {ratio !== null && ` (${ratio}%)`}
                    </Text>
                  </View>
                );
              })}
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
                let normalized = drink.instructions
                  .replace(/\\n/g, '\n')
                  .replace(/\\r\\n/g, '\n')
                  .replace(/\\r/g, '\n');
                
                // Split by newlines first
                let allLines: string[] = [];
                const initialLines = normalized.split(/\r?\n/);
                
                // Process each line - if it contains multiple numbered steps, split them
                initialLines.forEach(line => {
                  const trimmed = line.trim();
                  if (!trimmed) return;
                  
                  // Check if line contains numbered steps (pattern: number followed by period and space)
                  const numberedStepPattern = /\d+\.\s/g;
                  const matches = [...trimmed.matchAll(numberedStepPattern)];
                  
                  if (matches.length > 1) {
                    // Split on numbered patterns, keeping the number and period
                    const steps = trimmed.split(/(?=\d+\.\s)/);
                    allLines.push(...steps.map(s => s.trim()).filter(s => s));
                  } else {
                    allLines.push(trimmed);
                  }
                });
                
                return allLines.map((line, index) => {
                  const trimmed = line.trim();
                  // Render non-empty lines
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
              style={[styles.pourButton, (pouring || !canPour) && styles.pourButtonDisabled]}
              activeOpacity={0.8}
              onPress={handlePour}
              disabled={pouring || !canPour}
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
                <Animated.View
                  style={[
                    styles.iconWrapper,
                    styles.iconAbsolute,
                    {
                      opacity: xIconOpacity,
                      transform: [{ scale: xIconScale }],
                    },
                  ]}
                >
                  <View style={styles.xBubble}>
                    <Ionicons name="close" size={20} color="#000000" />
                  </View>
                </Animated.View>
              </View>
              <Text style={styles.pourButtonText}>
                {pourSuccess ? 'Pour Successful!' : pourFail ? 'Pour Failed' : canPour ? 'Pour This Drink' : 'Ingredients Not Available'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !deleting && setShowDeleteModal(false)}
        >
          <View
            style={styles.deleteModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>Delete Drink</Text>
            </View>
            
            <View style={styles.deleteModalBody}>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete &ldquo;{drink?.name}&rdquo;? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.deleteModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonDelete]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteModalButtonDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#0C0C0C',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    ...Platform.select({
      web: {
        position: 'relative',
        paddingTop: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
      },
    }),
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favoriteBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  mainContent: {
    marginTop: 80,
    ...Platform.select({
      web: {
        marginTop: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 40,
        gap: 40,
        paddingTop: 20,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    ...Platform.select({
      web: {
        width: 400,
        height: 400,
        flexShrink: 0,
        marginTop: 0,
      },
    }),
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
    ...Platform.select({
      web: {
        flex: 1,
        padding: 0,
        alignItems: 'flex-start',
        maxWidth: 600,
      },
    }),
  },
  drinkName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFA500',
    marginBottom: 16,
    textAlign: 'center',
    ...Platform.select({
      web: {
        textAlign: 'left',
        fontSize: 36,
      },
    }),
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        justifyContent: 'flex-start',
      },
    }),
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
    ...Platform.select({
      web: {
        alignItems: 'flex-start',
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        justifyContent: 'flex-start',
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#eee',
    textAlign: 'center',
    ...Platform.select({
      web: {
        textAlign: 'left',
      },
    }),
  },
  ingredientsList: {
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: {
        alignItems: 'flex-start',
      },
    }),
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        justifyContent: 'flex-start',
        maxWidth: '100%',
      },
    }),
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
    ...Platform.select({
      web: {
        alignItems: 'flex-start',
      },
    }),
  },
  instructionsText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: {
        textAlign: 'left',
      },
    }),
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
    ...Platform.select({
      web: {
        alignSelf: 'flex-start',
      },
    }),
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
  xBubble: {
    backgroundColor: '#FF4D4D',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
    ...Platform.select({
      web: {
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
  deleteModalHeader: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteModalBody: {
    padding: 20,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: '#2a2a2a',
  },
  deleteModalButtonDelete: {
    backgroundColor: '#FF4D4D',
  },
  deleteModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteModalButtonDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
