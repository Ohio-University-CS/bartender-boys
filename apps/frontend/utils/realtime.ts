import { API_BASE_URL } from '@/environment';
import type { RealtimeVoice } from '@/contexts/settings';

/**
 * Get an ephemeral token for OpenAI Realtime API from our backend
 * 
 * @param voice - The voice option to use for the realtime session (defaults to 'alloy')
 */
export async function getRealtimeToken(voice: RealtimeVoice = 'alloy'): Promise<{ client_secret: { value: string } }> {
  const response = await fetch(`${API_BASE_URL}/realtime/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ voice }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get realtime token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

