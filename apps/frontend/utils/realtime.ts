import { API_BASE_URL } from '@/environment';

/**
 * Get an ephemeral token for OpenAI Realtime API from our backend
 */
export async function getRealtimeToken(): Promise<{ client_secret: { value: string } }> {
  const response = await fetch(`${API_BASE_URL}/realtime/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get realtime token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

