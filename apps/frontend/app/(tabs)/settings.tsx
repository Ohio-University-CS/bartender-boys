import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { theme, setTheme, apiBaseUrl, setApiBaseUrl, reset } = useSettings();
  const [apiInput, setApiInput] = useState(apiBaseUrl);

  useEffect(() => {
    setApiInput(apiBaseUrl);
  }, [apiBaseUrl]);

  const applyApi = () => {
    setApiBaseUrl(apiInput.trim());
    Alert.alert('Saved', 'API base URL updated');
  };

  const clearBypass = async () => {
    await AsyncStorage.removeItem('isVerified');
    Alert.alert('Cleared', 'ID verification/skip has been cleared.');
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Appearance</ThemedText>
        <View style={styles.row}>
          <ThemedText>Use Dark Theme</ThemedText>
          <Switch value={(theme === 'dark')} onValueChange={(v) => setTheme(v ? 'dark' : 'light')} />
        </View>
        <View style={styles.row}>
          <ThemedText>Follow System</ThemedText>
          <Switch value={(theme === 'system')} onValueChange={(v) => setTheme(v ? 'system' : 'light')} />
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
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>ID Verification</ThemedText>
        <View style={styles.rowGap}>
          <TouchableOpacity style={styles.button} onPress={clearBypass}>
            <Text style={styles.buttonText}>Clear Skip/Verification</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>Advanced</ThemedText>
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
  section: {
    backgroundColor: '#121212',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    margin: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: { color: '#FFA500', fontSize: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowGap: { gap: 8, paddingTop: 4 },
  input: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, padding: 10, color: '#fff', marginTop: 8 },
  button: { backgroundColor: '#FFA500', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '700' },
  secondary: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
  secondaryText: { color: '#FFA500', fontWeight: '600' },
  help: { color: '#aaa', marginBottom: 8 },
  meta: { color: '#777', fontSize: 12, marginTop: 12 },
});
