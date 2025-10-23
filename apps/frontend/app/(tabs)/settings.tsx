import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const {
    theme, setTheme,
    apiBaseUrl, setApiBaseUrl,
    hapticsEnabled, setHapticsEnabled,
    hapticStrength, setHapticStrength,
    debugLogs, setDebugLogs,
    idPhotoWidth, setIdPhotoWidth,
    scanTimeoutMs, setScanTimeoutMs,
    displayName, setDisplayName,
    defaultMenuCategory, setDefaultMenuCategory,
    defaultShowFavorites, setDefaultShowFavorites,
    reset,
  } = useSettings();
  const [apiInput, setApiInput] = useState(apiBaseUrl);
  const [timeoutInput, setTimeoutInput] = useState(String(scanTimeoutMs));
  const [nameInput, setNameInput] = useState(displayName);

  useEffect(() => {
    setApiInput(apiBaseUrl);
  }, [apiBaseUrl]);
  useEffect(() => {
    setTimeoutInput(String(scanTimeoutMs));
  }, [scanTimeoutMs]);
  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  const applyApi = () => {
    setApiBaseUrl(apiInput.trim());
    Alert.alert('Saved', 'API base URL updated');
  };

  const applyTimeout = () => {
    const val = parseInt(timeoutInput, 10);
    if (Number.isNaN(val) || val < 1000) {
      Alert.alert('Invalid value', 'Enter a timeout in milliseconds (>= 1000)');
      return;
    }
    setScanTimeoutMs(val);
    Alert.alert('Saved', 'Scan timeout updated');
  };

  const clearBypass = async () => {
    await AsyncStorage.removeItem('isVerified');
    Alert.alert('Cleared', 'ID verification/skip has been cleared.');
  };

  const testBackend = async () => {
    const base = (apiBaseUrl || require('@/environment').API_BASE_URL) as string;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      Alert.alert('Backend OK', `URL: ${base}\nStatus: ${data.status || 'unknown'}`);
    } catch (e: any) {
      Alert.alert('Backend Unreachable', `Tried: ${base}\n${e?.message || e}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Profile</ThemedText>
        <ThemedText style={styles.help}>Set a display name (shown in the app where relevant)</ThemedText>
        <TextInput
          placeholder="Your name (e.g., Alex)"
          placeholderTextColor="#888"
          value={nameInput}
          onChangeText={setNameInput}
          style={styles.input}
        />
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setDisplayName(nameInput.trim());
              Alert.alert('Saved', 'Display name updated');
            }}
          >
            <Text style={styles.buttonText}>Save Name</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondary]}
            onPress={() => setNameInput('')}
          >
            <Text style={styles.secondaryText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Appearance</ThemedText>
        <ThemedText style={styles.help}>Select a theme mode</ThemedText>
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
            backgroundColor="#1a1a1a"
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
                style={[styles.chip, theme === opt.key && styles.chipActive]}
                onPress={() => setTheme(opt.key)}
              >
                <Text style={[styles.chipText, theme === opt.key && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.row}>
          <ThemedText>Haptic Feedback</ThemedText>
          <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} />
        </View>
        <ThemedText style={[styles.help, { marginTop: 4 }]}>Haptic strength</ThemedText>
        <View style={[styles.row, { justifyContent: 'space-around' }]}>
          {([
            { key: 'light', label: 'Light' },
            { key: 'medium', label: 'Medium' },
            { key: 'heavy', label: 'Heavy' },
          ] as const).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, hapticStrength === opt.key && styles.chipActive]}
              onPress={() => setHapticStrength(opt.key)}
            >
              <Text style={[styles.chipText, hapticStrength === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Menu Defaults</ThemedText>
        <ThemedText style={styles.help}>Choose the default category when opening the menu</ThemedText>
        <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'center', gap: 8 }]}>
          {['All', 'Cocktail', 'Whiskey', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Brandy', 'Non-Alcoholic'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, defaultMenuCategory === cat && styles.chipActive]}
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

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Backend</ThemedText>
        <ThemedText style={styles.help}>Override API base URL used by the app (use your LAN IP for phone testing)</ThemedText>
        <TextInput
          placeholder="http://192.168.x.x:8000"
          placeholderTextColor="#888"
          value={apiInput}
          onChangeText={setApiInput}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.rowGap}>
          <TouchableOpacity style={styles.button} onPress={applyApi}>
            <Text style={styles.buttonText}>Save API URL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setApiInput('')}>
            <Text style={styles.secondaryText}>Clear Override</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={testBackend}>
            <Text style={styles.secondaryText}>Test Backend Connection</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>ID Verification</ThemedText>
        <ThemedText style={styles.help}>Adjust image quality sent to server</ThemedText>
        <View style={[styles.row, { justifyContent: 'space-around' }]}>
          {[720, 900, 1200].map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.chip, idPhotoWidth === w && styles.chipActive]}
              onPress={() => setIdPhotoWidth(w)}
            >
              <Text style={[styles.chipText, idPhotoWidth === w && styles.chipTextActive]}>
                {w === 720 ? 'Low' : w === 900 ? 'Medium' : 'High'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ThemedText style={[styles.help, { marginTop: 8 }]}>Scan timeout (ms)</ThemedText>
        <View style={styles.row}>
          <TextInput
            placeholder="60000"
            placeholderTextColor="#888"
            value={timeoutInput}
            onChangeText={setTimeoutInput}
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.button} onPress={applyTimeout}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rowGap}>
          <TouchableOpacity style={styles.button} onPress={clearBypass}>
            <Text style={styles.buttonText}>Clear Skip/Verification</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Advanced</ThemedText>
        <View style={styles.row}>
          <ThemedText>Debug Logging</ThemedText>
          <Switch value={debugLogs} onValueChange={setDebugLogs} />
        </View>
        <View style={styles.rowGap}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={reset}>
            <Text style={styles.secondaryText}>Reset All Settings</Text>
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.meta}>Platform: {Platform.OS}</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  containerContent: { alignItems: 'center', paddingBottom: 24 },
  section: {
    backgroundColor: '#121212',
    borderColor: '#1f1f1f',
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
  input: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, padding: 10, color: '#fff', marginTop: 8, textAlign: 'center' },
  button: { backgroundColor: '#FFA500', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '700' },
  secondary: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
  secondaryText: { color: '#FFA500', fontWeight: '600' },
  help: { color: '#aaa', marginBottom: 8, textAlign: 'center' },
  meta: { color: '#777', fontSize: 12, marginTop: 12, textAlign: 'center' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  chipActive: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  chipText: { color: '#FFA500', fontWeight: '600' },
  chipTextActive: { color: '#000', fontWeight: '700' },
});
