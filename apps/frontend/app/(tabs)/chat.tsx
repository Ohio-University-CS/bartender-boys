import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import Markdown from 'react-native-markdown-display';
// EventSource usage:
// - Web: use native window.EventSource
// - Native: dynamically require('react-native-sse') at runtime to avoid build-time dependency when not installed

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      // Prefer EventSource (web native or react-native-sse on native)
      if (Platform.OS === 'web') {
        const aiId = `${Date.now()}-ai`;
        // Create placeholder AI message
        setMessages((m) => [...m, { id: aiId, role: 'assistant', content: '' }]);
        // Build URL using browser URL API
        const url = new URL(`${baseUrl}/chat/respond_stream`);
        url.searchParams.set('q', JSON.stringify(payload));

        let aiText = '';
        const es = new window.EventSource(url.toString());

        es.addEventListener('open', () => {
          console.log('[chat] SSE open');
        });

        es.addEventListener('message', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.delta) {
              aiText += String(data.delta);
              setMessages((m) => m.map((msg) => msg.id === aiId ? { ...msg, content: aiText } : msg));
            }
            if (data.done) {
              console.log('[chat] SSE done');
              es.close();
            }
            if (data.error) {
              throw new Error(String(data.error));
            }
          } catch (err: any) {
            console.log('[chat] SSE parse error', err?.message || String(err));
          }
        });

        es.addEventListener('error', (event: any) => {
          if (event.type === 'error') {
            console.log('[chat] SSE connection error', event.message);
          } else if (event.type === 'exception') {
            console.log('[chat] SSE exception', event.message, event.error);
          }
        });

        // Wait for completion before resolving onSend
        await new Promise<void>((resolve) => {
          const doneListener = (event: any) => {
            try {
              const data = JSON.parse(event.data);
              if (data.done) {
                es.removeEventListener('message', doneListener);
                es.close();
                resolve();
              }
            } catch {}
          };
          es.addEventListener('message', doneListener);
        });
      } else {
        // Native: use react-native-sse dynamically
        const aiId = `${Date.now()}-ai`;
        setMessages((m) => [...m, { id: aiId, role: 'assistant', content: '' }]);
        const url = `${baseUrl}/chat/respond_stream?q=${encodeURIComponent(JSON.stringify(payload))}`;
        const { default: EventSourceRN } = await import('react-native-sse');
        let aiText = '';
        const es = new EventSourceRN(url);
        es.addEventListener('open', () => {
          // no-op
        });
        es.addEventListener('message', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.delta) {
              aiText += String(data.delta);
              setMessages((m) => m.map((msg) => msg.id === aiId ? { ...msg, content: aiText } : msg));
            }
            if (data.done) {
              es.close();
            }
            if (data.error) {
              throw new Error(String(data.error));
            }
          } catch {}
        });
        es.addEventListener('error', (_event: any) => {
          // no-op; message handler will produce error bubble
        });
        await new Promise<void>((resolve) => {
          const doneListener = (event: any) => {
            try {
              const data = JSON.parse(event.data);
              if (data.done) {
                es.removeEventListener('message', doneListener);
                es.close();
                resolve();
              }
            } catch {}
          };
          es.addEventListener('message', doneListener);
        });
      }
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
      {item.role === 'assistant' ? (
        <Markdown style={{
          body: { color: bubbleText, fontSize: 15, lineHeight: 22 },
          paragraph: { marginBottom: 8 },
          code_inline: { backgroundColor: aiBubbleBg, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
          fence: { backgroundColor: aiBubbleBg, padding: 12, borderRadius: 4, marginVertical: 8 },
          code_block: { backgroundColor: aiBubbleBg, padding: 12, borderRadius: 4, marginVertical: 8 },
          list_item: { marginBottom: 4 },
          strong: { fontWeight: '700' },
          em: { fontStyle: 'italic' },
          link: { color: '#FFA500' },
        }}>
          {item.content}
        </Markdown>
      ) : (
        <Text style={[styles.bubbleText, { color: '#000' }]}>{item.content}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
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
    </View>
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
