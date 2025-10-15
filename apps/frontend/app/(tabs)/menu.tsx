import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';

const categories = [
  'All', 'Classic', 'Tequila', 'Vodka', 'Gin', 'Rum', 'Whiskey', 'Cognac'
];

const drinks = [
  {
    name: 'Old Fashioned',
    type: 'Classic',
    description: 'The timeless classic. Smooth, strong, and sophisticated.',
    ingredients: ['oz Bourbon', 'Sugar Cube', 'dashes Angostura Bitters', '+1 more'],
    time: '3:00',
    abv: '40% ABV',
    difficulty: 'Medium',
    category: 'Whiskey',
  },
  {
    name: 'Margarita',
    type: 'Tequila',
    description: '',
    ingredients: [],
    time: '',
    abv: '',
    difficulty: '',
    category: 'Tequila',
  },
  // Add more drinks as needed
];

export default function MenuScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'background');

  const filteredDrinks =
    selectedCategory === 'All'
      ? drinks
      : drinks.filter((d) => d.category === selectedCategory || d.type === selectedCategory);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 16, paddingHorizontal: 8 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={{
              backgroundColor: selectedCategory === cat ? tint : '#222',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8,
            }}
          >
            <Text style={{ color: selectedCategory === cat ? '#000' : text, fontWeight: 'bold' }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Drink List */}
      <FlatList
        data={filteredDrinks}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: text, fontSize: 20, fontWeight: 'bold' }}>{item.name}</Text>
                <Text style={{ color: tint, fontSize: 16 }}>{item.type}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="heart-outline" size={24} color={tint} />
              </TouchableOpacity>
            </View>
            {item.description ? (
              <Text style={{ color: text, marginTop: 8 }}>{item.description}</Text>
            ) : null}
            {/* Ingredients */}
            {item.ingredients.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {item.ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: '#222',
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginRight: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: text, fontSize: 13 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Info Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {item.time ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name="time-outline" size={16} color={text} />
                  <Text style={{ color: text, marginLeft: 4 }}>{item.time}</Text>
                </View>
              ) : null}
              {item.abv ? (
                <Text style={{ color: text, marginRight: 16 }}>{item.abv}</Text>
              ) : null}
              {item.difficulty ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={16} color={tint} />
                  <Text style={{ color: text, marginLeft: 4 }}>{item.difficulty}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}
