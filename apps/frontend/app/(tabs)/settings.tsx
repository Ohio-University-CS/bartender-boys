import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme, setTheme,
    displayName, setDisplayName,
    profilePronouns, setProfilePronouns,
    favoriteSpirit, setFavoriteSpirit,
    homeBarName, setHomeBarName,
    bartenderBio, setBartenderBio,
    defaultMenuCategory, setDefaultMenuCategory,
    defaultShowFavorites, setDefaultShowFavorites,
  } = useSettings();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#f5f5f5', dark: '#121212' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#1f1f1f' }, 'background');
  const helpText = useThemeColor({ light: '#666', dark: '#aaa' }, 'text');
  const chipBg = useThemeColor({ light: '#e8e8e8', dark: '#1a1a1a' }, 'background');
  const chipBorder = useThemeColor({ light: '#d0d0d0', dark: '#2a2a2a' }, 'background');
  const segmentBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');
  const inputBorder = useThemeColor({ light: '#d0d0d0', dark: '#2a2a2a' }, 'background');
  const placeholderColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

  const [nameInput, setNameInput] = useState(displayName);
  const [pronounsInput, setPronounsInput] = useState(profilePronouns);
  const [spiritInput, setSpiritInput] = useState(favoriteSpirit);
  const [homeBarInput, setHomeBarInput] = useState(homeBarName);
  const [bioInput, setBioInput] = useState(bartenderBio);

  useEffect(() => setNameInput(displayName), [displayName]);
  useEffect(() => setPronounsInput(profilePronouns), [profilePronouns]);
  useEffect(() => setSpiritInput(favoriteSpirit), [favoriteSpirit]);
  useEffect(() => setHomeBarInput(homeBarName), [homeBarName]);
  useEffect(() => setBioInput(bartenderBio), [bartenderBio]);

  const handleSaveProfile = () => {
    setDisplayName(nameInput.trim());
    setProfilePronouns(pronounsInput.trim());
    setFavoriteSpirit(spiritInput.trim());
    setHomeBarName(homeBarInput.trim());
    setBartenderBio(bioInput.trim());
    Alert.alert('Saved', 'Profile details updated');
  };

  const handleClearProfile = () => {
    setNameInput('');
    setPronounsInput('');
    setSpiritInput('');
    setHomeBarInput('');
    setBioInput('');
    setDisplayName('');
    setProfilePronouns('');
    setFavoriteSpirit('');
    setHomeBarName('');
    setBartenderBio('');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('isVerified');
              router.replace('/auth');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView contentContainerStyle={styles.containerContent}>
      <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <ThemedText type="title" style={styles.sectionTitle}>Profile</ThemedText>
        <ThemedText style={[styles.help, { color: helpText }]}>Personalize how the bartender greets you</ThemedText>
        <TextInput
          placeholder="Your name"
          value={nameInput}
          onChangeText={setNameInput}
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          autoCapitalize="words"
        />
        <TextInput
          placeholder="Pronouns (e.g., she/her)"
          value={pronounsInput}
          onChangeText={setPronounsInput}
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Favorite spirit"
          value={spiritInput}
          onChangeText={setSpiritInput}
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          autoCapitalize="words"
        />
        <TextInput
          placeholder="Home bar name"
          value={homeBarInput}
          onChangeText={setHomeBarInput}
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          autoCapitalize="words"
        />
        <TextInput
          placeholder="Add a short bio or preferences"
          value={bioInput}
          onChangeText={setBioInput}
          style={[styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FFA500' }]}
            onPress={handleSaveProfile}
          >
            <Text style={styles.buttonText}>Save Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondary, { backgroundColor: inputBg, borderColor: inputBorder }]}
            onPress={handleClearProfile}
          >
            <Text style={styles.secondaryText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <ThemedText type="title" style={styles.sectionTitle}>Appearance</ThemedText>
        <ThemedText style={[styles.help, { color: helpText }]}>Select a theme mode</ThemedText>
        {Platform.OS === 'ios' ? (
          <SegmentedControl
            values={["System", "Light", "Dark"]}
            selectedIndex={theme === 'system' ? 0 : theme === 'light' ? 1 : 2}
            onChange={(e) => {
              const index = e.nativeEvent.selectedSegmentIndex;
              const selected = index === 0 ? 'system' : index === 1 ? 'light' : 'dark';
              setTheme(selected);
            }}
            tintColor="#FFA500"
            backgroundColor={segmentBg}
            fontStyle={{ color: '#FFA500' }}
            activeFontStyle={{ color: '#000', fontWeight: '700' }}
          />
        ) : (
          <View style={[styles.row, { justifyContent: 'space-around' }]}>
            {([
              { key: 'system', label: 'System' },
              { key: 'light', label: 'Light' },
              { key: 'dark', label: 'Dark' },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.chip,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  theme === opt.key && styles.chipActive
                ]}
                onPress={() => setTheme(opt.key)}
              >
                <Text style={[styles.chipText, theme === opt.key && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <ThemedText type="title" style={styles.sectionTitle}>Menu Defaults</ThemedText>
        <ThemedText style={[styles.help, { color: helpText }]}>Choose the default category when opening the menu</ThemedText>
        <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'center', gap: 8 }]}>
          {['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy', 'Non-Alcoholic'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor: chipBorder },
                defaultMenuCategory === cat && styles.chipActive
              ]}
              onPress={() => setDefaultMenuCategory(cat)}
            >
              <Text style={[styles.chipText, defaultMenuCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          <ThemedText>Show favorites only by default</ThemedText>
          <Switch value={defaultShowFavorites} onValueChange={setDefaultShowFavorites} />
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <ThemedText type="title" style={styles.sectionTitle}>Personalization</ThemedText>
        <View style={styles.row}>
          <ThemedText>Animations</ThemedText>
          <Switch value={true} onValueChange={() => {}} />
        </View>
        <ThemedText style={[styles.help, { marginTop: 4, color: helpText }]}>Enable smooth animations throughout the app</ThemedText>
        
        <View style={styles.row}>
          <ThemedText>Sound Effects</ThemedText>
          <Switch value={false} onValueChange={() => {}} />
        </View>
        <ThemedText style={[styles.help, { marginTop: 4, color: helpText }]}>Play sounds for actions and notifications</ThemedText>
        
        <View style={styles.row}>
          <ThemedText>Auto-save Favorites</ThemedText>
          <Switch value={true} onValueChange={() => {}} />
        </View>
        <ThemedText style={[styles.help, { marginTop: 4, color: helpText }]}>Automatically sync favorites across sessions</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <ThemedText type="title" style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF4444' }]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerContent: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  section: {
    borderWidth: 1,
    margin: 12,
    padding: 16,
    borderRadius: 12,
    width: '95%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  sectionTitle: { color: '#FFA500', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, width: '100%' },
  rowGap: { gap: 8, paddingTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, textAlign: 'left' },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8, minHeight: 96, textAlign: 'left' },
  button: { backgroundColor: '#FFA500', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '700' },
  secondary: { borderWidth: 1 },
  secondaryText: { color: '#FFA500', fontWeight: '600' },
  help: { marginBottom: 8, textAlign: 'center' },
  meta: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  chipText: { color: '#FFA500', fontWeight: '600' },
  chipTextActive: { color: '#000', fontWeight: '700' },
});
