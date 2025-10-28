import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { BartenderAvatar } from '@/components/BartenderAvatar';

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatScreen() {
  const { apiBaseUrl } = useSettings();
  const baseUrl = apiBaseUrl || API_BASE_URL;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', role: 'assistant', content: "Hey! I'm your Bartender AI. Ask me for recipes, swaps, or pairing ideas." },
  ]);
  const [busy, setBusy] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const talkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      
      // Trigger talking animation when assistant responds
      setIsTalking(true);
      if (talkingTimeoutRef.current) {
        clearTimeout(talkingTimeoutRef.current);
      }
      // Estimate talking duration based on message length (avg 150 words per minute)
      const wordCount = reply.split(' ').length;
      const talkingDuration = Math.max(2000, (wordCount / 150) * 60 * 1000);
      talkingTimeoutRef.current = setTimeout(() => {
        setIsTalking(false);
      }, talkingDuration);
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (talkingTimeoutRef.current) {
        clearTimeout(talkingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 3D Bartender Avatar - Circular ChatGPT-style */}
        <View style={styles.avatarContainer}>
          <BartenderAvatar isTalking={isTalking} />
        </View>
        
        <FlatList
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#0C0C0C',
  },
  avatarContainer: { 
    width: '100%', 
    paddingVertical: Platform.OS === 'web' ? 20 : 10, // Less padding on mobile
    paddingHorizontal: Platform.OS === 'web' ? 40 : 12,
    marginTop: Platform.OS === 'web' ? 0 : 5, // Reduced from 10 since SafeAreaView handles top spacing
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { 
    padding: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 8, // Less top padding on mobile
  },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFA500' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
  bubbleText: { color: '#fff' },
  inputRow: { 
    flexDirection: 'row', 
    padding: 12, 
    gap: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#222',
    paddingBottom: Platform.OS === 'web' ? 12 : 20, // Extra bottom padding on mobile for safe area
  },
  input: { flex: 1, backgroundColor: '#121212', color: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1f1f1f' },
  sendBtn: { backgroundColor: '#FFA500', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
