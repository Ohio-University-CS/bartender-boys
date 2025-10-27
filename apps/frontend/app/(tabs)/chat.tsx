import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatScreen() {
  const router = useRouter();
  const { apiBaseUrl } = useSettings();
  const baseUrl = apiBaseUrl || API_BASE_URL;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', role: 'assistant', content: "Hey! I'm your Bartender AI. Ask me for recipes, swaps, or pairing ideas." },
  ]);
  const [busy, setBusy] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#121212' }, 'background');
  const inputBorder = useThemeColor({ light: '#d0d0d0', dark: '#1f1f1f' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#222' }, 'background');
  const aiBubbleBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
  const aiBubbleBorder = useThemeColor({ light: '#d0d0d0', dark: '#2a2a2a' }, 'background');
  const bubbleText = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({ light: '#888', dark: '#666' }, 'text');

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMsg = { id: `${Date.now()}`, role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const payload = {
        messages: [
          { role: 'system', content: 'You are a helpful bartender assistant. Provide concise cocktail advice, recipes, and substitutions. Keep answers short.' },
          ...messages.map(({ role, content }) => ({ role, content })),
          { role: 'user', content: text },
        ],
      };
      const resp = await axios.post(`${baseUrl}/chat/respond`, payload, { timeout: 45000 });
      const reply = String(resp.data?.reply || '');
      const aiMsg: ChatMsg = { id: `${Date.now()}-ai`, role: 'assistant', content: reply || 'Sorry, I could not think of anything right now.' };
      setMessages((m) => [...m, aiMsg]);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Network error.';
      setMessages((m) => [...m, { id: `${Date.now()}-err`, role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, baseUrl, messages]);

  const renderItem = ({ item }: { item: ChatMsg }) => (
    <View style={[
      styles.bubble,
      item.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: aiBubbleBg, borderColor: aiBubbleBorder }]
    ]}>
      <Text style={[styles.bubbleText, { color: item.role === 'user' ? '#000' : bubbleText }]}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
        <TouchableOpacity
          style={styles.talkBtn}
          onPress={() => router.push('/bartender')}
          accessibilityLabel="Talk to bartender"
        >
          <Ionicons name="mic" size={16} color="#000" />
          <Text style={styles.talkText}>Talk to bartender</Text>
        </TouchableOpacity>
        <View style={[styles.inputRow, { borderTopColor: borderColor }]}>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="Ask the bartender..."
            placeholderTextColor={placeholderColor}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSend}
            editable={!busy}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={busy}>
            <Ionicons name="paper-plane" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFA500' },
  aiBubble: { alignSelf: 'flex-start', borderWidth: 1 },
  bubbleText: {},
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 },
  sendBtn: { backgroundColor: '#FFA500', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  talkBtn: { position: 'absolute', right: 16, bottom: 80, backgroundColor: '#FFA500', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  talkText: { color: '#000', fontWeight: '700' },
});
