import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cocktails as allCocktails } from '../../data/cocktails';

export default function MenuScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [favorites, setFavorites] = useState([]);

  const filters = ['all', 'strong', 'sweet', 'refreshing'];

  const filteredCocktails = allCocktails.filter((cocktail) => {
    const matchesSearch = cocktail.name.toLowerCase().includes(search.toLowerCase()) ||
      cocktail.flavor.toLowerCase().includes(search.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'strong') return matchesSearch && cocktail.alcohol >= 25;
    if (filter === 'sweet') return matchesSearch && cocktail.flavor.includes('Sweet');
    if (filter === 'refreshing') return matchesSearch && cocktail.flavor.includes('Refreshing');

    return matchesSearch;
  });

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cocktails..."
          placeholderTextColor="#737373"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cocktails List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredCocktails.map((cocktail, idx) => (
          <Animated.View
            key={cocktail.id}
            entering={FadeInDown.delay(idx * 50)}
          >
            <TouchableOpacity
              style={styles.cocktailCard}
              onPress={() => navigation.navigate('Dispensing', { cocktail })}
            >
              <Text style={styles.cocktailEmoji}>{cocktail.emoji}</Text>
              
              <View style={styles.cocktailInfo}>
                <Text style={styles.cocktailName}>{cocktail.name}</Text>
                <Text style={styles.cocktailFlavor}>{cocktail.flavor}</Text>
                <View style={styles.alcoholBadge}>
                  <Text style={styles.alcoholText}>{cocktail.alcohol}% ABV</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(cocktail.id)}
              >
                <Text style={styles.favoriteIcon}>
                  {favorites.includes(cocktail.id) ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {filteredCocktails.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No cocktails found</Text>
            <Text style={styles.emptySubtext}>Try a different search or filter</Text>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.2)',
  },
  backButton: {
    fontSize: 28,
    color: '#D97706',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#F5F5F5',
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterText: {
    fontSize: 14,
    color: '#737373',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
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
    color: '#737373',
    marginBottom: 8,
  },
  alcoholBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  alcoholText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 28,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
  },
});