import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function FavoritesScreen({ navigation }) {
  // In a real app, this would come from global state or context
  const favorites = [];

  const handleOrderDrink = (cocktail) => {
    navigation.navigate('Dispensing', { cocktail });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⭐</Text>
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Add cocktails to your favorites from the menu or chat
            </Text>
          </View>
        ) : (
          favorites.map((cocktail, idx) => (
            <Animated.View
              key={cocktail.id}
              entering={FadeInUp.delay(idx * 100)}
            >
              <TouchableOpacity
                style={styles.cocktailCard}
                onPress={() => handleOrderDrink(cocktail)}
              >
                <Text style={styles.cocktailEmoji}>{cocktail.emoji}</Text>
                
                <View style={styles.cocktailInfo}>
                  <Text style={styles.cocktailName}>{cocktail.name}</Text>
                  <Text style={styles.cocktailFlavor}>{cocktail.flavor}</Text>
                  <Text style={styles.cocktailDescription} numberOfLines={2}>
                    {cocktail.description}
                  </Text>
                </View>

                <TouchableOpacity style={styles.orderButton}>
                  <Text style={styles.orderButtonText}>Order</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.2)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  cocktailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  cocktailEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  cocktailInfo: {
    flex: 1,
  },
  cocktailName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  cocktailFlavor: {
    fontSize: 14,
    color: '#D97706',
    marginBottom: 6,
  },
  cocktailDescription: {
    fontSize: 13,
    color: '#737373',
    lineHeight: 18,
  },
  orderButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});