import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { useRouter } from 'expo-router';

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
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.bubbleText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask the bartender..."
          placeholderTextColor="#888"
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  list: { padding: 12 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFA500' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
  bubbleText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#222' },
  input: { flex: 1, backgroundColor: '#121212', color: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1f1f1f' },
  sendBtn: { backgroundColor: '#FFA500', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  talkBtn: { position: 'absolute', right: 16, bottom: 80, backgroundColor: '#FFA500', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  talkText: { color: '#000', fontWeight: '700' },
});
