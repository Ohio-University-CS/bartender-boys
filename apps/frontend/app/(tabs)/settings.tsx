import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Switch, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
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
  const surface = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const helpText = useThemeColor({}, 'muted');
  const chipBg = useThemeColor({}, 'chipBackground');
  const chipBorder = useThemeColor({}, 'chipBorder');
  const segmentBg = useThemeColor({}, 'surfaceAlt');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const danger = useThemeColor({}, 'danger');
  const onDanger = useThemeColor({}, 'onDanger');

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
      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Profile</ThemedText>
        <ThemedText style={styles.help} colorName="muted">Personalize how the bartender greets you</ThemedText>
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
            style={[styles.button, { backgroundColor: accent }]}
            onPress={handleSaveProfile}
          >
            <ThemedText style={styles.buttonText} colorName="onTint">Save Profile</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondary, { backgroundColor: surface, borderColor: inputBorder }]}
            onPress={handleClearProfile}
          >
            <ThemedText style={styles.secondaryText} colorName="tint">Clear</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Appearance</ThemedText>
        <ThemedText style={styles.help} colorName="muted">Select a theme mode</ThemedText>
        {Platform.OS === 'ios' ? (
          <SegmentedControl
            values={["System", "Light", "Dark"]}
            selectedIndex={theme === 'system' ? 0 : theme === 'light' ? 1 : 2}
            onChange={(e) => {
              const index = e.nativeEvent.selectedSegmentIndex;
              const selected = index === 0 ? 'system' : index === 1 ? 'light' : 'dark';
              setTheme(selected);
            }}
            tintColor={accent}
            backgroundColor={segmentBg}
            fontStyle={{ color: mutedForeground, fontWeight: '500' }}
            activeFontStyle={{ color: onAccent, fontWeight: '700' }}
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
                  theme === opt.key && [
                    styles.chipActive,
                    { backgroundColor: accent, borderColor: accent },
                  ]
                ]}
                onPress={() => setTheme(opt.key)}
              >
                <ThemedText
                  style={styles.chipText}
                  colorName={theme === opt.key ? 'onTint' : 'mutedForeground'}
                >
                  {opt.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Menu Defaults</ThemedText>
        <ThemedText style={styles.help} colorName="muted">Choose the default category when opening the menu</ThemedText>
        <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'center', gap: 8 }]}>
          {['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy', 'Non-Alcoholic'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor: chipBorder },
                defaultMenuCategory === cat && [
                  styles.chipActive,
                  { backgroundColor: accent, borderColor: accent },
                ]
              ]}
              onPress={() => setDefaultMenuCategory(cat)}
            >
              <ThemedText
                style={styles.chipText}
                colorName={defaultMenuCategory === cat ? 'onTint' : 'mutedForeground'}
              >
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          <ThemedText>Show favorites only by default</ThemedText>
          <Switch
            value={defaultShowFavorites}
            onValueChange={setDefaultShowFavorites}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Personalization</ThemedText>
        <View style={styles.row}>
          <ThemedText>Animations</ThemedText>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Enable smooth animations throughout the app</ThemedText>

        <View style={styles.row}>
          <ThemedText>Sound Effects</ThemedText>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Play sounds for actions and notifications</ThemedText>

        <View style={styles.row}>
          <ThemedText>Auto-save Favorites</ThemedText>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Automatically sync favorites across sessions</ThemedText>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: danger }]}
            onPress={handleLogout}
          >
            <ThemedText style={styles.buttonText} colorName="onDanger">Log Out</ThemedText>
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
  sectionTitle: { fontSize: 18, marginBottom: 8, textAlign: 'center', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, width: '100%' },
  rowGap: { gap: 8, paddingTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, textAlign: 'left' },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8, minHeight: 96, textAlign: 'left' },
  button: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '700' },
  secondary: { borderWidth: 1 },
  secondaryText: { fontWeight: '600' },
  help: { marginBottom: 8, textAlign: 'center' },
  helpInset: { marginTop: 4 },
  meta: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipActive: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipText: { fontWeight: '600' },
});
