export interface Drink {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  ratios?: number[];
  instructions: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
  user_id?: string;
  image_url?: string;
  image_data?: string; // Base64 data URI (data:image/png;base64,...)
  favorited?: boolean;
  hardwareSteps?: { pump: string; seconds: number }[];
  created_at?: string;
}

export const DRINKS: Drink[] = [];

export function getDrinkById(id: string): Drink | undefined {
  return DRINKS.find(d => d.id === id);
}