import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/settings';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { TabHeader } from '@/components/tab-header';
import { getConversations, createConversation, deleteConversation, type Conversation } from '@/utils/chat-api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { webStyles } from '@/utils/web-styles';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiBaseUrl } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Chat';
    }
  }, []);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'surfaceElevated');
  const accent = useThemeColor({}, 'tint');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const metaText = useThemeColor({}, 'muted');

  // Load user_id from AsyncStorage
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('user_id');
        setUserId(storedUserId || 'guest');
      } catch (error) {
        console.error('Failed to load user_id:', error);
        setUserId('guest');
      }
    };
    loadUserId();
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getConversations(userId, apiBaseUrl);
      setConversations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('[ChatScreen] Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, apiBaseUrl]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh conversations when screen comes into focus (e.g., when returning from a conversation)
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchConversations();
      }
    }, [userId, fetchConversations])
  );

  const handleCreateConversation = useCallback(async () => {
    if (!userId) return;

    try {
      const newConversation = await createConversation(userId, apiBaseUrl);
      router.push(`/conversation/${newConversation.id}` as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('[ChatScreen] Error creating conversation:', err);
    }
  }, [userId, apiBaseUrl, router]);

  const handleConversationPress = useCallback((conversationId: string) => {
    router.push(`/conversation/${conversationId}` as any);
  }, [router]);

  const confirmDeleteConversation = useCallback((conversation: Conversation) => {
    const proceed = async () => {
      setDeletingId(conversation.id);
      try {
        // Get user_id from AsyncStorage
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) {
          Alert.alert('Error', 'User not authenticated');
          setDeletingId(null);
          return;
        }
        
        await deleteConversation(conversation.id, userId, apiBaseUrl);
        setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      } catch (err: any) {
        const message = err?.message || 'Failed to delete conversation. Please try again.';
        console.error('[ChatScreen] Delete conversation error:', err);
        if (typeof window !== 'undefined') {
          window.alert(message);
        }
      } finally {
        setDeletingId((current) => (current === conversation.id ? null : current));
      }
    };

    if (typeof window !== 'undefined' && Platform.OS === 'web') {
      if (window.confirm('Delete this conversation and all messages?')) {
        void proceed();
      }
      return;
    }

    Alert.alert(
      'Delete conversation',
      'This will remove the entire chat and its messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void proceed() },
      ]
    );
  }, [apiBaseUrl]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    const isDeleting = deletingId === item.id;
    return (
      <View style={[styles.conversationCard, { backgroundColor: cardBg, borderColor }, webStyles.shadow]}>
        <TouchableOpacity 
          style={[styles.conversationContent, webStyles.hoverable, webStyles.transition]} 
          onPress={() => handleConversationPress(item.id)}
        >
          <ThemedText type="defaultSemiBold" style={styles.conversationTitle}>
            {item.title || 'New Conversation'}
          </ThemedText>
          <ThemedText style={[styles.conversationDate, { color: metaText }]}>
            {formatDate(item.updated_at)}
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => handleConversationPress(item.id)}
            style={[styles.iconButton, webStyles.hoverable, webStyles.transition]}
            accessibilityLabel="Open conversation"
          >
            <Ionicons name="chevron-forward" size={20} color={mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDeleteConversation(item)}
            style={[styles.iconButton, webStyles.hoverable, webStyles.transition]}
            disabled={isDeleting}
            accessibilityLabel="Delete conversation"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={mutedForeground} />
            ) : (
              <Ionicons name="trash" size={18} color={mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [cardBg, borderColor, metaText, mutedForeground, handleConversationPress, deletingId, confirmDeleteConversation]);

  const handleBartenderPress = useCallback(() => {
    // Navigate to the voice assistant screen (not the bartender selection tab)
    // Use href to explicitly target the stack route, not the tab route
    // The voice assistant is at /bartender (stack route), not /(tabs)/bartender (tab route)
    router.push('/bartender' as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}> 
      <TabHeader 
        centerActionButtons={
          <>
            <TouchableOpacity
              style={[
                styles.headerButton, 
                { backgroundColor: accent },
                webStyles.hoverable,
                webStyles.shadow,
              ]}
              onPress={handleBartenderPress}
            >
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerButton, 
                { backgroundColor: accent },
                webStyles.hoverable,
                webStyles.shadow,
              ]}
              onPress={handleCreateConversation}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={styles.loadingText} colorName="muted">Loading conversations...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText} colorName="danger">{error}</ThemedText>
          <TouchableOpacity onPress={fetchConversations} style={styles.retryButton}>
            <ThemedText colorName="tint">Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText} colorName="muted">No conversations yet</ThemedText>
              <ThemedText style={styles.emptySubtext} colorName="muted">Tap the + button to start a new conversation</ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        width: 40,
        height: 40,
        borderRadius: 20,
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  list: {
    padding: 12,
    ...Platform.select({
      web: {
        padding: 16,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  conversationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      web: {
        borderRadius: 14,
        padding: 18,
        cursor: 'pointer',
      },
    }),
  },
  conversationContent: {
    flex: 1,
    paddingRight: 8,
  },
  conversationTitle: {
    fontSize: 16,
    marginBottom: 4,
    marginRight: 160,
  },
  conversationDate: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    padding: 6,
    borderRadius: 10,
  },
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
});
