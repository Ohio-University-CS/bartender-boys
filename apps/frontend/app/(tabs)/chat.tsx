import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import Markdown from 'react-native-markdown-display';
import { BartenderAvatar } from '@/components/BartenderAvatar';
import { ThemedText } from '@/components/themed-text';
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
  const [isTalking, setIsTalking] = useState(false);
  const talkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<ChatMsg> | null>(null);

  const stopTalkingImmediately = useCallback(() => {
    if (talkingTimeoutRef.current) {
      clearTimeout(talkingTimeoutRef.current);
      talkingTimeoutRef.current = null;
    }
    setIsTalking(false);
  }, []);

  const finalizeTalking = useCallback((text: string) => {
    if (talkingTimeoutRef.current) {
      clearTimeout(talkingTimeoutRef.current);
      talkingTimeoutRef.current = null;
    }
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const talkingDuration = Math.max(2000, (wordCount / 150) * 60 * 1000);
    talkingTimeoutRef.current = setTimeout(() => {
      setIsTalking(false);
      talkingTimeoutRef.current = null;
    }, talkingDuration);
  }, []);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const borderColor = useThemeColor({}, 'border');
  const aiBubbleBg = useThemeColor({}, 'surface');
  const aiBubbleBorder = useThemeColor({}, 'border');
  const bubbleText = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const avatarBorder = useThemeColor({}, 'border');
  const avatarBackground = useThemeColor({}, 'surface');
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');

  useEffect(() => {
    return () => {
      if (talkingTimeoutRef.current) {
        clearTimeout(talkingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMsg = { id: `${Date.now()}`, role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    stopTalkingImmediately();
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
        setMessages((m) => [...m, { id: aiId, role: 'assistant', content: '' }]);
        setIsTalking(true);

        const url = new URL(`${baseUrl}/chat/respond_stream`);
        url.searchParams.set('q', JSON.stringify(payload));

        let aiText = '';
        let completed = false;
        const markComplete = () => {
          if (completed) return;
          completed = true;
          finalizeTalking(aiText);
        };

        const es = new window.EventSource(url.toString());

        es.addEventListener('open', () => {
          console.log('[chat] SSE open');
        });

        es.addEventListener('message', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.delta) {
              aiText += String(data.delta);
              setMessages((m) =>
                m.map((msg) => (msg.id === aiId ? { ...msg, content: aiText } : msg))
              );
            }
            if (data.done) {
              console.log('[chat] SSE done');
              markComplete();
              es.close();
            }
            if (data.error) {
              throw new Error(String(data.error));
            }
          } catch (err: any) {
            console.log('[chat] SSE parse error', err?.message || String(err));
          }
        });

        // Wait for completion before resolving onSend
        await new Promise<void>((resolve) => {
          function cleanup() {
            es.removeEventListener('message', doneListener);
            es.removeEventListener('error', errorListener);
          }
          function doneListener(event: any) {
            try {
              const data = JSON.parse(event.data);
              if (data.done) {
                markComplete();
                cleanup();
                es.close();
                resolve();
              }
            } catch {}
          }
          function errorListener(event: any) {
            console.log('[chat] SSE connection error', event?.message);
            stopTalkingImmediately();
            cleanup();
            es.close();
            resolve();
          }
          es.addEventListener('message', doneListener);
          es.addEventListener('error', errorListener);
        });
      } else {
        // Native: use react-native-sse dynamically
        const aiId = `${Date.now()}-ai`;
        setMessages((m) => [...m, { id: aiId, role: 'assistant', content: '' }]);
        setIsTalking(true);
        const url = `${baseUrl}/chat/respond_stream?q=${encodeURIComponent(JSON.stringify(payload))}`;
        const { default: EventSourceRN } = await import('react-native-sse');
        let aiText = '';
        let completed = false;
        const markComplete = () => {
          if (completed) return;
          completed = true;
          finalizeTalking(aiText);
        };

        const es = new EventSourceRN(url);
        es.addEventListener('open', () => {
          // no-op
        });
        es.addEventListener('message', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.delta) {
              aiText += String(data.delta);
              setMessages((m) =>
                m.map((msg) => (msg.id === aiId ? { ...msg, content: aiText } : msg))
              );
            }
            if (data.done) {
              markComplete();
              es.close();
            }
            if (data.error) {
              throw new Error(String(data.error));
            }
          } catch {}
        });
        await new Promise<void>((resolve) => {
          function cleanup() {
            es.removeEventListener('message', doneListener);
            es.removeEventListener('error', errorListener);
          }
          function doneListener(event: any) {
            try {
              const data = JSON.parse(event.data);
              if (data.done) {
                markComplete();
                cleanup();
                es.close();
                resolve();
              }
            } catch {}
          }
          function errorListener(event: any) {
            stopTalkingImmediately();
            cleanup();
            es.close();
            resolve();
          }
          es.addEventListener('message', doneListener);
          es.addEventListener('error', errorListener);
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Network error.';
      setMessages((m) => [...m, { id: `${Date.now()}-err`, role: 'assistant', content: `Error: ${msg}` }]);
      stopTalkingImmediately();
    } finally {
      setBusy(false);
    }
  }, [input, busy, baseUrl, messages, finalizeTalking, stopTalkingImmediately]);

  const renderItem = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: accent }]
            : [styles.aiBubble, { backgroundColor: aiBubbleBg, borderColor: aiBubbleBorder }],
        ]}
      >
        {isUser ? (
          <ThemedText style={[styles.bubbleText, { color: onAccent }]}>{item.content}</ThemedText>
        ) : (
          <Markdown
            style={{
              body: { color: bubbleText, fontSize: 15, lineHeight: 22 },
              paragraph: { marginBottom: 8 },
              code_inline: {
                backgroundColor: aiBubbleBg,
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                fontSize: 13,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
              },
              fence: { backgroundColor: aiBubbleBg, padding: 12, borderRadius: 4, marginVertical: 8 },
              code_block: { backgroundColor: aiBubbleBg, padding: 12, borderRadius: 4, marginVertical: 8 },
              list_item: { marginBottom: 4 },
              strong: { fontWeight: '700' },
              em: { fontStyle: 'italic' },
              link: { color: accent },
            }}
          >
            {item.content}
          </Markdown>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={[styles.avatarContainer, { borderBottomColor: avatarBorder, backgroundColor: avatarBackground }]}>
            <BartenderAvatar
              isTalking={isTalking}
              backgroundColor={avatarBackground}
            />
          </View>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        </View>
        <View style={[styles.controls, { borderTopColor: borderColor }]}>
          <TouchableOpacity
            style={[styles.talkBtn, { backgroundColor: accent, shadowColor: accent }]}
            onPress={() => router.push('/bartender' as never)}
            accessibilityLabel="Talk to bartender"
          >
            <Ionicons name="mic" size={16} color={onAccent} />
            <ThemedText style={styles.talkText} colorName="onTint">Talk to bartender</ThemedText>
          </TouchableOpacity>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
              placeholder="Ask the bartender..."
              placeholderTextColor={placeholderColor}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={onSend}
              editable={!busy}
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accent }]} onPress={onSend} disabled={busy}>
              <Ionicons name="paper-plane" size={18} color={onAccent} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  content: { flex: 1 },
  avatarContainer: {
    width: '100%',
    paddingVertical: Platform.OS === 'web' ? 20 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start', borderWidth: 1 },
  bubbleText: {},
  controls: { padding: 12, gap: 12, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 },
  sendBtn: { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  talkBtn: { alignSelf: 'flex-end', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  talkText: { fontWeight: '700' },
});
