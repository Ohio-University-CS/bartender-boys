import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/contexts/favorites';
import { DRINKS, getDrinkById } from '@/constants/drinks';

export default function FavoritesScreen() {
  const { ids, toggleFavorite, isFavorite } = useFavorites();
  const items = ids.map((id) => getDrinkById(id)).filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Favorites</ThemedText>
      </ThemedView>

      <ThemedView style={styles.list}>
        {items.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No favorites yet</ThemedText>
            <ThemedText style={styles.emptyHelp}>Tap the heart on menu items to save them here.</ThemedText>
          </ThemedView>
        )}

        {items.map((drink) => (
          <ThemedView key={drink!.id} style={styles.card}>
            <View style={styles.rowTop}>
              <ThemedText type="defaultSemiBold" style={styles.name}>{drink!.name}</ThemedText>
              <TouchableOpacity onPress={() => toggleFavorite(drink!.id)}>
                <Ionicons
                  name={isFavorite(drink!.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(drink!.id) ? '#FF4D4D' : '#aaa'}
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.category}>{drink!.category}</ThemedText>
            <ThemedText style={styles.meta}>{drink!.prepTime} • {drink!.difficulty}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  header: {
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0C0C0C',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFA500' },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#fff' },
  category: { fontSize: 13, color: '#FFA500', marginTop: 2 },
  meta: { color: '#bbb', fontSize: 12, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptyHelp: { fontSize: 13, color: '#777', marginTop: 4 },
});
