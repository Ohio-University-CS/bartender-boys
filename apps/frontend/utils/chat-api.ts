import { API_BASE_URL } from '@/environment';

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Fetch all conversations for a user
 */
export async function getConversations(
  user_id: string,
  apiBaseUrl?: string
): Promise<Conversation[]> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/chat/conversations?user_id=${encodeURIComponent(user_id)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Create a new conversation
 */
export async function createConversation(
  user_id: string,
  apiBaseUrl?: string
): Promise<Conversation> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/chat/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create conversation: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Delete a conversation and all of its chats
 */
export async function deleteConversation(
  conversation_id: string,
  user_id: string,
  apiBaseUrl?: string
): Promise<void> {
  const baseUrl = apiBaseUrl || API_BASE_URL;

  const response = await fetch(`${baseUrl}/chat/conversations/${conversation_id}?user_id=${encodeURIComponent(user_id)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete conversation: ${response.status} - ${errorText}`);
  }
}

/**
 * Fetch all chats for a conversation
 */
export async function getConversationChats(
  conversation_id: string,
  user_id: string,
  apiBaseUrl?: string
): Promise<ChatMessage[]> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/chat/conversations/${conversation_id}/chats?user_id=${encodeURIComponent(user_id)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch chats: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Add a chat message to a conversation
 */
export async function createChat(
  conversation_id: string,
  role: 'user' | 'assistant',
  content: string,
  user_id: string,
  apiBaseUrl?: string
): Promise<ChatMessage> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/chat/conversations/${conversation_id}/chats?user_id=${encodeURIComponent(user_id)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, content }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create chat: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Delete a chat message from a conversation
 */
export async function deleteChat(
  conversation_id: string,
  chat_id: string,
  user_id: string,
  apiBaseUrl?: string
): Promise<void> {
  const baseUrl = apiBaseUrl || API_BASE_URL;

  const response = await fetch(
    `${baseUrl}/chat/conversations/${conversation_id}/chats/${chat_id}?user_id=${encodeURIComponent(user_id)}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete chat: ${response.status} - ${errorText}`);
  }
}

