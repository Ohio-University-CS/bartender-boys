import { API_BASE_URL } from '@/environment';
import type { Drink } from '@/constants/drinks';

export interface DrinksListResponse {
  drinks: Drink[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface GetDrinksParams {
  skip?: number;
  limit?: number;
  user_id: string;  // Required
  category?: string;
  favorited?: boolean;
}

/**
 * Fetch drinks from the backend API with pagination
 */
export async function getDrinks(
  params: GetDrinksParams,
  apiBaseUrl?: string
): Promise<DrinksListResponse> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  const { skip = 0, limit = 20, user_id, category, favorited } = params;
  
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
    user_id: user_id,  // Always required
  });
  if (category) {
    queryParams.append('category', category);
  }
  if (favorited !== undefined) {
    queryParams.append('favorited', favorited.toString());
  }
  
  const response = await fetch(`${baseUrl}/drinks?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch drinks: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Fetch a single drink by ID
 */
export async function getDrinkById(
  drinkId: string,
  userId: string,
  apiBaseUrl?: string
): Promise<Drink> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/drinks/${drinkId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Drink not found');
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch drink: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Toggle the favorited status of a drink
 */
export async function toggleFavorite(
  drinkId: string,
  userId: string,
  apiBaseUrl?: string
): Promise<Drink> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/drinks/${drinkId}/favorite?user_id=${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to toggle favorite: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Delete a drink by ID
 */
export async function deleteDrink(
  drinkId: string,
  userId: string,
  apiBaseUrl?: string
): Promise<void> {
  const baseUrl = apiBaseUrl || API_BASE_URL;
  
  const response = await fetch(`${baseUrl}/drinks/${drinkId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Drink not found');
    }
    const errorText = await response.text();
    throw new Error(`Failed to delete drink: ${response.status} - ${errorText}`);
  }
}

