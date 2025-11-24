import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/settings';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getConversations, createConversation, deleteConversation, type Conversation } from '@/utils/chat-api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiBaseUrl } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        await deleteConversation(conversation.id, apiBaseUrl);
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
      <View style={[styles.conversationCard, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity style={styles.conversationContent} onPress={() => handleConversationPress(item.id)}>
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
            style={styles.iconButton}
            accessibilityLabel="Open conversation"
          >
            <Ionicons name="chevron-forward" size={20} color={mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDeleteConversation(item)}
            style={styles.iconButton}
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
    router.push('/bartender' as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}> 
      <ThemedView colorName="surface" style={[styles.header, { borderBottomColor: borderColor }]}> 
        <ThemedText type="title" colorName="tint" style={styles.title}>Chats</ThemedText>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: accent }]}
            onPress={handleBartenderPress}
          >
            <Ionicons name="mic" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: accent }]}
            onPress={handleCreateConversation}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ThemedView>

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
  },
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  conversationContent: {
    flex: 1,
    paddingRight: 8,
  },
  conversationTitle: {
    fontSize: 16,
    marginBottom: 4,
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
