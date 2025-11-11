import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, Switch, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_OPTIONS } from '@/constants/theme';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@/environment';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme,
    setTheme,
    apiBaseUrl,
    setApiBaseUrl,
    accentColor,
    setAccentColor,
    animationsEnabled,
    setAnimationsEnabled,
    autoSaveFavorites,
    setAutoSaveFavorites,
  } = useSettings();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
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

  const [apiUrlInput, setApiUrlInput] = useState(apiBaseUrl || API_BASE_URL);

  useEffect(() => setApiUrlInput(apiBaseUrl || API_BASE_URL), [apiBaseUrl]);


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


  const handleExportLogs = () => {
    Alert.alert(
      'Log export',
      'Connect the device to your development machine to pull the latest log bundle for support. Automated export is coming soon.'
    );
  };

  const handleClearMenuCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const targets = keys.filter((key) => key.includes('menu') || key.includes('favorites'));
      if (targets.length > 0) {
        await AsyncStorage.multiRemove(targets);
      }
      Alert.alert('Cache cleared', targets.length > 0 ? 'Menu and favorites caches cleared.' : 'No cached menu data found.');
    } catch (error) {
      console.error('Cache clear error', error);
      Alert.alert('Error', 'Unable to clear cached data. Try again.');
    }
  };

  const diagnosticsSummary = useMemo(() => {
    const version = Constants.expoConfig?.version ?? 'dev';
    const easExtra = (Constants.expoConfig as { extra?: { eas?: { buildNumber?: string } } } | undefined)?.extra?.eas;
    const build = easExtra?.buildNumber ?? Constants.nativeBuildVersion ?? 'dev';
    return `Version ${version} (build ${build})`;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView contentContainerStyle={styles.containerContent}>

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
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Accent color</ThemedText>
        <View style={styles.accentRow}>
          {ACCENT_OPTIONS.map((option) => {
            const isActive = accentColor === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={styles.accentChoice}
                onPress={() => setAccentColor(option.key)}
              >
                <View
                  style={[
                    styles.accentSwatch,
                    { backgroundColor: option.preview },
                    isActive && [styles.accentSwatchActive, { borderColor: accent }],
                  ]}
                />
                <ThemedText
                  style={styles.accentLabel}
                  colorName={isActive ? 'tint' : 'mutedForeground'}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Personalization</ThemedText>
        <View style={styles.row}>
          <ThemedText>Animations</ThemedText>
          <Switch
            value={animationsEnabled}
            onValueChange={setAnimationsEnabled}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Enable smooth animations throughout the app</ThemedText>

        <View style={styles.row}>
          <ThemedText>Auto-save Favorites</ThemedText>
          <Switch
            value={autoSaveFavorites}
            onValueChange={setAutoSaveFavorites}
            trackColor={{ false: mutedForeground, true: accent }}
            thumbColor={Platform.OS === 'android' ? onAccent : undefined}
          />
        </View>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">Automatically sync favorites across sessions</ThemedText>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Development</ThemedText>
        <ThemedText style={styles.help} colorName="muted">Backend API URL (for development)</ThemedText>
        <ThemedText style={[styles.help, styles.helpInset]} colorName="muted">
          Current: {apiBaseUrl || API_BASE_URL}
        </ThemedText>
        <TextInput
          placeholder={`http://${Platform.OS === 'ios' ? 'YOUR_MAC_IP' : 'localhost'}:8000`}
          value={apiUrlInput}
          onChangeText={setApiUrlInput}
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            onPress={() => {
              const trimmed = apiUrlInput.trim();
              if (trimmed) {
                setApiBaseUrl(trimmed);
                Alert.alert('Saved', 'API URL updated. Restart the app if connection issues persist.');
              } else {
                setApiBaseUrl('');
                Alert.alert('Cleared', 'Using default API URL');
              }
            }}
          >
            <ThemedText style={styles.buttonText} colorName="onTint">Save API URL</ThemedText>
          </TouchableOpacity>
          {apiBaseUrl && (
            <TouchableOpacity
              style={[styles.button, styles.secondary, { backgroundColor: surface, borderColor: inputBorder }]}
              onPress={() => {
                setApiBaseUrl('');
                setApiUrlInput(API_BASE_URL);
                Alert.alert('Reset', 'Using default API URL');
              }}
            >
              <ThemedText style={styles.secondaryText} colorName="tint">Reset to Default</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>

      <ThemedView colorName="surfaceElevated" style={[styles.section, { borderColor }]}> 
        <ThemedText type="subtitle" colorName="tint" style={styles.sectionTitle}>Data & Diagnostics</ThemedText>
        <ThemedText style={styles.help} colorName="muted">Manage cache and share runtime info with support</ThemedText>

        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.button, styles.secondary, { backgroundColor: surface, borderColor: inputBorder }]}
            onPress={handleExportLogs}
          >
            <ThemedText style={styles.secondaryText} colorName="tint">Export latest logs</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondary, { backgroundColor: surface, borderColor: inputBorder }]}
            onPress={handleClearMenuCache}
          >
            <ThemedText style={styles.secondaryText} colorName="tint">Clear cached menu data</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={[styles.meta, { color: mutedForeground }]}>{diagnosticsSummary}</ThemedText>
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
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    paddingTop: 12,
  },
  accentChoice: {
    alignItems: 'center',
    width: 96,
  },
  accentSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  accentSwatchActive: {
    borderWidth: 3,
  },
  accentLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  quietHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  quietField: {
    flex: 1,
  },
  quietLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  quietInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontVariant: ['tabular-nums'],
  },
});
