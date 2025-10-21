export interface Drink {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  instructions: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
}

export const DRINKS: Drink[] = [
  {
    id: '1',
    name: 'Classic Margarita',
    category: 'Cocktail',
    ingredients: ['2 oz Tequila', '1 oz Lime Juice', '1 oz Triple Sec', 'Salt rim', 'Lime wedge'],
    instructions: '1. Rim glass with salt\n2. Shake all ingredients with ice\n3. Strain into glass\n4. Garnish with lime wedge',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '2',
    name: 'Old Fashioned',
    category: 'Whiskey',
    ingredients: ['2 oz Bourbon', '1 sugar cube', '2 dashes Angostura bitters', 'Orange peel', 'Ice'],
    instructions: '1. Muddle sugar cube with bitters\n2. Add bourbon and ice\n3. Stir gently\n4. Express orange peel over drink',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '3',
    name: 'Mojito',
    category: 'Rum',
    ingredients: ['2 oz White Rum', '1 oz Lime Juice', '2 tsp Sugar', '6-8 Mint leaves', 'Soda water'],
    instructions: '1. Muddle mint and sugar\n2. Add lime juice and rum\n3. Fill with ice\n4. Top with soda water\n5. Garnish with mint',
    difficulty: 'Easy',
    prepTime: '5 min'
  },
  {
    id: '4',
    name: 'Negroni',
    category: 'Gin',
    ingredients: ['1 oz Gin', '1 oz Campari', '1 oz Sweet Vermouth', 'Orange peel'],
    instructions: '1. Add all ingredients to mixing glass\n2. Add ice and stir\n3. Strain into glass\n4. Express orange peel',
    difficulty: 'Easy',
    prepTime: '2 min'
  }
];

export function getDrinkById(id: string): Drink | undefined {
  return DRINKS.find(d => d.id === id);
}