import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import Markdown from 'react-native-markdown-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import { getConversationChats, createChat, type ChatMessage } from '@/utils/chat-api';

export default function ConversationScreen() {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { apiBaseUrl } = useSettings();
  const baseUrl = apiBaseUrl || API_BASE_URL;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const talkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const dotAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const stopTalkingImmediately = useCallback(() => {
    if (talkingTimeoutRef.current) {
      clearTimeout(talkingTimeoutRef.current);
      talkingTimeoutRef.current = null;
    }
  }, []);

  const finalizeTalking = useCallback((text: string) => {
    if (talkingTimeoutRef.current) {
      clearTimeout(talkingTimeoutRef.current);
      talkingTimeoutRef.current = null;
    }
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const talkingDuration = Math.max(2000, (wordCount / 150) * 60 * 1000);
    talkingTimeoutRef.current = setTimeout(() => {
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
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getConversationChats(conversationId, apiBaseUrl);
      setMessages(data);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('[ConversationScreen] Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, apiBaseUrl]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    return () => {
      if (talkingTimeoutRef.current) {
        clearTimeout(talkingTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || !conversationId) return;
    
    // Save user message to database
    let userMessage: ChatMessage;
    try {
      userMessage = await createChat(conversationId, 'user', text, apiBaseUrl);
      setMessages((m) => [...m, userMessage]);
    } catch (err) {
      console.error('[ConversationScreen] Error saving user message:', err);
      // Continue anyway with local message
      userMessage = {
        id: `${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMessage]);
    }
    
    setInput('');
    setBusy(true);
    stopTalkingImmediately();
    
    try {
      // Build messages array for OpenAI
      const openAIMessages = messages.map(({ role, content }) => ({ role, content }));
      
      // Add the new user message
      openAIMessages.push({ role: 'user', content: text });
      
      const payload = {
        messages: [
          { role: 'system', content: 'You are a helpful bartender assistant. Provide concise cocktail advice, recipes, and substitutions. Keep answers short.' },
          ...openAIMessages,
        ],
      };
      
      // Prefer EventSource (web native or react-native-sse on native)
      if (Platform.OS === 'web') {
        const aiId = `${Date.now()}-ai`;
        const tempAiMessage: ChatMessage = {
          id: aiId,
          conversation_id: conversationId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        };
        setMessages((m) => [...m, tempAiMessage]);

        const url = new URL(`${baseUrl}/chat/respond_stream`);
        url.searchParams.set('q', JSON.stringify(payload));

        let aiText = '';
        let completed = false;
        const markComplete = () => {
          if (completed) return;
          completed = true;
          finalizeTalking(aiText);
          
          // Save assistant message to database
          if (aiText.trim()) {
            createChat(conversationId, 'assistant', aiText, apiBaseUrl).catch(err => {
              console.error('[ConversationScreen] Error saving assistant message:', err);
            });
          }
        };

        const es = new window.EventSource(url.toString());

        es.addEventListener('open', () => {
          console.log('[conversation] SSE open');
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
              console.log('[conversation] SSE done');
              markComplete();
              es.close();
            }
            if (data.error) {
              throw new Error(String(data.error));
            }
          } catch (err: any) {
            console.log('[conversation] SSE parse error', err?.message || String(err));
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
            console.log('[conversation] SSE connection error', event?.message);
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
        const tempAiMessage: ChatMessage = {
          id: aiId,
          conversation_id: conversationId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        };
        setMessages((m) => [...m, tempAiMessage]);
        
        const url = `${baseUrl}/chat/respond_stream?q=${encodeURIComponent(JSON.stringify(payload))}`;
        const { default: EventSourceRN } = await import('react-native-sse');
        let aiText = '';
        let completed = false;
        const markComplete = () => {
          if (completed) return;
          completed = true;
          finalizeTalking(aiText);
          
          // Save assistant message to database
          if (aiText.trim()) {
            createChat(conversationId, 'assistant', aiText, apiBaseUrl).catch(err => {
              console.error('[ConversationScreen] Error saving assistant message:', err);
            });
          }
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
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-err`,
        conversation_id: conversationId,
        role: 'assistant',
        content: `Error: ${msg}`,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, errorMessage]);
      stopTalkingImmediately();
    } finally {
      setBusy(false);
    }
  }, [input, busy, baseUrl, messages, conversationId, apiBaseUrl, finalizeTalking, stopTalkingImmediately]);

  // Animate loading dots
  useEffect(() => {
    if (busy) {
      const animations = dotAnimations.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      });
      
      Animated.parallel(animations).start();
    } else {
      dotAnimations.forEach(anim => anim.setValue(0));
    }
  }, [busy, dotAnimations]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isLoading = !isUser && !item.content.trim();
    
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
        ) : isLoading ? (
          <View style={styles.loadingDotsContainer}>
            {dotAnimations.map((anim, index) => {
              const opacity = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              });
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.loadingDot,
                    { backgroundColor: bubbleText, opacity },
                  ]}
                />
              );
            })}
          </View>
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText type="title" colorName="tint" style={styles.title}>Conversation</ThemedText>
          <View style={{ width: 24 }} />
        </ThemedView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={styles.loadingText} colorName="muted">Loading messages...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText type="title" colorName="tint" style={styles.title}>Conversation</ThemedText>
          <View style={{ width: 24 }} />
        </ThemedView>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText} colorName="danger">{error}</ThemedText>
          <TouchableOpacity onPress={loadMessages} style={styles.retryButton}>
            <ThemedText colorName="tint">Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="title" colorName="tint" style={styles.title}>Conversation</ThemedText>
        <View style={{ width: 24 }} />
      </ThemedView>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText} colorName="muted">No messages yet</ThemedText>
              <ThemedText style={styles.emptySubtext} colorName="muted">Start the conversation below</ThemedText>
            </View>
          }
        />
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
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accent }]} onPress={onSend} disabled={busy}>
            <Ionicons name="paper-plane" size={18} color={onAccent} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  list: { padding: 12, paddingBottom: 120 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start', borderWidth: 1 },
  bubbleText: {},
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 },
  sendBtn: { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

