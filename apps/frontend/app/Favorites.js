import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Modal, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';

const categories = ['All', 'Classic', 'Tequila', 'Vodka', 'Gin', 'Rum', 'Whiskey', 'Cognac', 'Custom'];

export default function FavoritesScreen() {
    const [favorites, setFavorites] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const tint = useThemeColor({}, 'tint');
    const text = useThemeColor({}, 'text');
    const bg = useThemeColor({}, 'background');

    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const stored = await AsyncStorage.getItem('favorites');
                if (stored) {
                    setFavorites(JSON.parse(stored));
                }
            } catch (err) {
                console.error('Error loading favorites', err);
            }
        };
        loadFavorites();
    }, []);

    const removeFavorite = async (name) => {
        const updated = favorites.filter((d) => d.name !== name);
        setFavorites(updated);
        await AsyncStorage.setItem('favorites', JSON.stringify(updated));
    };

    const filteredDrinks =
        selectedCategory === 'All'
            ? favorites
            : favorites.filter(
                (d) => d.category === selectedCategory || d.type === selectedCategory
            );

    return (
        <View style={{flex: 1, backgroundColor: bg}}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                }}
            >
                <Text style={{color: text, fontSize: 22, fontWeight: 'bold'}}>
                    Favorites
                </Text>
                <Ionicons name="heart" size={28} color={tint}/>
            </View>

            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{paddingVertical: 12, paddingHorizontal: 8}}
            >
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
                        <Text
                            style={{
                                color: selectedCategory === cat ? '#000' : text,
                                fontWeight: 'bold',
                            }}
                        >
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Favorite Drinks List */}
            <Flatlist
                data={filteredDrinks}
                keyExtractor={(item) => item.name}
                contentContainerStyle={{padding: 16}}
                ListEmptyComponent={() => (
                    <Text style={{color: '#777', textAlign: 'center', marginTop: 40}}>
                        No favorites yet.
                    </Text>
                )}
                renderItem={({item}) => (
                    <View
                        style={{
                            backgroundColor: '#181818',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <View>
                                <Text style={{color: text, fontSize: 20, fontWeight: 'bold'}}>
                                    {item.name}
                                </Text>
                                <Text style={{color: tint, fontSize: 16}}>{item.type}</Text>
                            </View>

                            <TouchableOpacity onPress={() => removeFavorite(item.name)}>
                                <Ionicons name="heart" size={24} color={tint}/>
                            </TouchableOpacity>
                        </View>

                        {item.description ? (
                            <Text style={{color: text, marginTop: 8}}>
                                {item.description}
                            </Text>
                        ) : null}

                        {/* Ingredients */}
                        {item.ingredients?.length > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    marginTop: 8,
                                }}
                            >
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
                                        <Text style={{color: text, fontSize: 13}}>{ing}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Info Row */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 8,
                            }}
                        >
                            {item.time ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginRight: 16,
                                    }}
                                >
                                    <Ionicons name="time-outline" size={16} color={text}/>
                                    <Text style={{color: text, marginLeft: 4}}>{item.time}</Text>
                                </View>
                            ) : null}

                            {item.abv ? (
                                <Text style={{color: text, marginRight: 16}}>{item.abv}</Text>
                            ) : null}

                            {item.difficulty ? (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Ionicons name="star" size={16} color={tint}/>
                                    <Text style={{color: text, marginLeft: 4}}>
                                        {item.difficulty}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                )}
            />
        </View>
    );
}
