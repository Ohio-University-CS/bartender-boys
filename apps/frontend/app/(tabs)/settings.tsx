import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { TabHeader } from '@/components/tab-header';
import { Dropdown } from '@/components/dropdown';
import { ACCENT_OPTIONS } from '@/constants/theme';
import { useSettings, REALTIME_VOICES } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '@/environment';
import { BARTENDER_MODEL_OPTIONS } from '@/constants/bartender-models';
import { webStyles } from '@/utils/web-styles';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    setTheme,
    apiBaseUrl,
    setApiBaseUrl,
    accentColor,
    setAccentColor,
    realtimeVoice,
    setRealtimeVoice,
    bartenderModel,
    setBartenderModel,
  } = useSettings();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surfaceElevated');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const accent = useThemeColor({}, 'tint');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const danger = useThemeColor({}, 'danger');

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'BrewBot - Settings';
    }
  }, []);

  const [apiUrlInput, setApiUrlInput] = useState(apiBaseUrl || API_BASE_URL);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pump1, setPump1] = useState<string>('');
  const [pump2, setPump2] = useState<string>('');
  const [pump3, setPump3] = useState<string>('');
  const [loadingPumpConfig, setLoadingPumpConfig] = useState<boolean>(false);
  const [savingPumpConfig, setSavingPumpConfig] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPumpConfig, setShowPumpConfig] = useState(false);

  useEffect(() => setApiUrlInput(apiBaseUrl || API_BASE_URL), [apiBaseUrl]);

  // Load user information from AsyncStorage
  const loadUserInfo = useCallback(async () => {
    try {
      const [name, id] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('user_id'),
      ]);
      setUserName(name);
      setUserId(id);
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  }, []);

  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  // Refresh user info when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
    }, [loadUserInfo])
  );

  // Load pump configuration
  useEffect(() => {
    const loadPumpConfig = async () => {
      if (!userId) return;
      
      setLoadingPumpConfig(true);
      try {
        const baseUrl = apiBaseUrl || API_BASE_URL;
        const response = await fetch(`${baseUrl}/iot/pump-config?user_id=${encodeURIComponent(userId)}`);
        
        if (response.ok) {
          const config = await response.json();
          setPump1(config.pump1 || '');
          setPump2(config.pump2 || '');
          setPump3(config.pump3 || '');
        } else {
          // If no config exists, that's fine - start with empty values
          setPump1('');
          setPump2('');
          setPump3('');
        }
      } catch (error) {
        console.error('Failed to load pump config:', error);
        // Start with empty values on error
        setPump1('');
        setPump2('');
        setPump3('');
      } finally {
        setLoadingPumpConfig(false);
      }
    };
    
    loadPumpConfig();
  }, [userId, apiBaseUrl]);

  const handleSavePumpConfig = async () => {
    if (!userId) {
      Alert.alert('Error', 'Please log in to configure pumps');
      return;
    }

    setSavingPumpConfig(true);
    try {
      const baseUrl = apiBaseUrl || API_BASE_URL;
      const response = await fetch(`${baseUrl}/iot/pump-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          pump1: pump1.trim() || null,
          pump2: pump2.trim() || null,
          pump3: pump3.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Backend returned ${response.status}`);
      }

      Alert.alert('Success', 'Pump configuration saved successfully');
    } catch (error: any) {
      console.error('Failed to save pump config:', error);
      Alert.alert('Error', error?.message || 'Failed to save pump configuration');
    } finally {
      setSavingPumpConfig(false);
    }
  };


  const handleLogout = async () => {
    console.log('[Settings] Logout button pressed, starting logout process');
    try {
      // Remove verification flag and user info
      await AsyncStorage.removeItem('isVerified');
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem('user_name');
      console.log('[Settings] Removed user info from AsyncStorage');
      
      // Clear state immediately
      setUserName(null);
      setUserId(null);
      
      // Verify it was removed
      const stillVerified = await AsyncStorage.getItem('isVerified');
      console.log('[Settings] Verification check after removal:', stillVerified);
      
      // Use setTimeout to ensure navigation happens after state updates
      setTimeout(() => {
        console.log('[Settings] Navigating to /auth');
        try {
          router.replace('/auth' as any);
          console.log('[Settings] Navigation called successfully');
        } catch (navError) {
          console.error('[Settings] Navigation error:', navError);
          // Fallback: try navigating to root
          router.replace('/' as any);
        }
      }, 200);
    } catch (error) {
      console.error('[Settings] Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}> 
      <TabHeader title="Settings" />

      <ScrollView 
        contentContainerStyle={styles.containerContent}
        style={webStyles.smoothScroll}
      >

        {/* Appearance Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Appearance</ThemedText>
          
          {/* Theme Mode */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-palette-outline" size={24} color={textColor} style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Theme</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <Dropdown
                options={[
                  { value: 'system' as const, label: 'System' },
                  { value: 'light' as const, label: 'Light' },
                  { value: 'dark' as const, label: 'Dark' },
                ]}
                value={theme}
                onValueChange={(value) => setTheme(value)}
              />
            </View>
          </View>

          {/* Accent Color */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="brush-outline" size={24} color={textColor} style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Accent Color</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <Dropdown
                options={ACCENT_OPTIONS.map(option => ({
                  value: option.key,
                  label: option.label,
                  preview: (
                    <View style={[styles.accentPreview, { backgroundColor: option.preview || accent }]} />
                  ),
                }))}
                value={accentColor}
                onValueChange={(value) => setAccentColor(value)}
                renderValue={(value) => {
                  const option = ACCENT_OPTIONS.find(o => o.key === value);
                  return (
                    <View style={styles.settingRight}>
                      <View style={[styles.accentPreview, { backgroundColor: option?.preview || accent }]} />
                      <ThemedText style={styles.settingValue} colorName="mutedForeground">
                        {option?.label || 'Sunset Citrus'}
                      </ThemedText>
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </View>

        {/* Personalization Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Personalization</ThemedText>
          
          {/* Realtime Voice */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mic-outline" size={24} color={textColor} style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Voice</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <Dropdown
                options={REALTIME_VOICES.map(voice => ({
                  value: voice,
                  label: voice.charAt(0).toUpperCase() + voice.slice(1),
                }))}
                value={realtimeVoice}
                onValueChange={(value) => setRealtimeVoice(value)}
              />
            </View>
          </View>

          {/* Bartender Model */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={24} color={textColor} style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Bartender Model</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <Dropdown
                options={BARTENDER_MODEL_OPTIONS.map(option => ({
                  value: option.id,
                  label: option.label,
                }))}
                value={bartenderModel}
                onValueChange={(value) => setBartenderModel(value)}
              />
            </View>
          </View>
        </View>

        {/* Equipment Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Equipment</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingRow, webStyles.hoverable]}
            onPress={() => setShowPumpConfig(!showPumpConfig)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="settings-outline" size={24} color={textColor} style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Pump Configuration</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <Ionicons 
                name={showPumpConfig ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={mutedForeground} 
              />
            </View>
          </TouchableOpacity>

          {showPumpConfig && (
            <View style={styles.expandedContent}>
              {loadingPumpConfig ? (
                <ThemedText style={styles.expandedText} colorName="muted">Loading...</ThemedText>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.inputLabel} colorName="mutedForeground">Pump 1</ThemedText>
                    <TextInput
                      placeholder="e.g., water, sprite, cola"
                      value={pump1}
                      onChangeText={setPump1}
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      placeholderTextColor={placeholderColor}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.inputLabel} colorName="mutedForeground">Pump 2</ThemedText>
                    <TextInput
                      placeholder="e.g., water, sprite, cola"
                      value={pump2}
                      onChangeText={setPump2}
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      placeholderTextColor={placeholderColor}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.inputLabel} colorName="mutedForeground">Pump 3</ThemedText>
                    <TextInput
                      placeholder="e.g., water, sprite, cola"
                      value={pump3}
                      onChangeText={setPump3}
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      placeholderTextColor={placeholderColor}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.saveButton, 
                      { backgroundColor: accent },
                      webStyles.hoverable,
                      webStyles.shadow,
                      (savingPumpConfig || !userId) && styles.buttonDisabled,
                    ]}
                    onPress={handleSavePumpConfig}
                    disabled={savingPumpConfig || !userId}
                  >
                    <ThemedText style={styles.saveButtonText} colorName="onTint">
                      {savingPumpConfig ? 'Saving...' : 'Save'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {!userId && (
                    <ThemedText style={styles.expandedText} colorName="muted">
                      Please log in to configure pumps
                    </ThemedText>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Account</ThemedText>
          
          {userName && (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="person-outline" size={24} color={textColor} style={styles.settingIcon} />
                <ThemedText style={styles.settingLabel}>Name</ThemedText>
              </View>
              <ThemedText style={styles.settingValue} colorName="mutedForeground">
                {userName}
              </ThemedText>
            </View>
          )}
          
          {userId && (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="id-card-outline" size={24} color={textColor} style={styles.settingIcon} />
                <ThemedText style={styles.settingLabel}>
                  {userId === 'guest' ? 'User ID' : "Driver's License"}
                </ThemedText>
              </View>
              <ThemedText style={styles.settingValue} colorName="mutedForeground">
                {userId === 'guest' ? 'Guest' : userId}
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.settingRow, webStyles.hoverable]}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color={danger} style={styles.settingIcon} />
              <ThemedText style={[styles.settingLabel, { color: danger }]}>Log Out</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Development Section */}
        <TouchableOpacity 
          style={[styles.settingRow, webStyles.hoverable]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="code-outline" size={24} color={textColor} style={styles.settingIcon} />
            <ThemedText style={styles.settingLabel}>Development</ThemedText>
          </View>
          <View style={styles.settingRight}>
            <Ionicons 
              name={showAdvanced ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={mutedForeground} 
            />
          </View>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={[styles.section, styles.expandedContent]}>
            <ThemedText style={styles.inputLabel} colorName="mutedForeground">API URL</ThemedText>
            <ThemedText style={styles.expandedText} colorName="muted">
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
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { backgroundColor: accent },
                  webStyles.hoverable,
                  webStyles.shadow,
                ]}
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
                <ThemedText style={styles.saveButtonText} colorName="onTint">Save</ThemedText>
              </TouchableOpacity>
              {apiBaseUrl && (
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    { backgroundColor: surface, borderColor: inputBorder, borderWidth: 1 },
                    webStyles.hoverable,
                  ]}
                  onPress={() => {
                    setApiBaseUrl('');
                    setApiUrlInput(API_BASE_URL);
                    Alert.alert('Reset', 'Using default API URL');
                  }}
                >
                  <ThemedText style={styles.saveButtonText} colorName="text">Reset</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  containerContent: { 
    paddingBottom: 24,
    ...Platform.select({
      web: {
        paddingBottom: 40,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  section: {
    marginTop: 24,
    ...Platform.select({
      web: {
        marginTop: 32,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#9BA1A6',
    ...Platform.select({
      web: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
      },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        cursor: 'pointer',
      },
    }),
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  accentPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      web: {
        paddingHorizontal: 20,
        paddingBottom: 20,
      },
    }),
  },
  expandedText: {
    fontSize: 14,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, width: '100%' },
  rowGap: { gap: 8, paddingTop: 4 },
  input: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16,
    ...Platform.select({
      web: {
        padding: 14,
        borderRadius: 10,
        fontSize: 15,
        outline: 'none',
        transition: 'border-color 0.2s ease-in-out',
      },
    }),
  },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8, minHeight: 96, textAlign: 'left' },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 10,
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  saveButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    ...Platform.select({
      web: {
        cursor: 'not-allowed' as any,
      },
    }),
  },
});
