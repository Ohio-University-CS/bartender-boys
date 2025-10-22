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
  },
  // Cocktail (General)
  {
    id: '5',
    name: 'Cosmopolitan',
    category: 'Cocktail',
    ingredients: ['1.5 oz Vodka', '1 oz Cranberry Juice', '0.5 oz Triple Sec', '0.5 oz Lime Juice', 'Orange peel (optional)'],
    instructions: '1. Shake all ingredients with ice\n2. Strain into a chilled coupe\n3. Garnish with orange peel',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '26',
    name: 'Sidecar',
    category: 'Cocktail',
    ingredients: ['2 oz Cognac', '1 oz Triple Sec', '0.75 oz Lemon Juice', 'Sugar rim (optional)'],
    instructions: '1. Shake with ice\n2. Strain into coupe (sugar rim optional)\n3. Garnish with lemon twist',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  {
    id: '27',
    name: 'Paloma',
    category: 'Cocktail',
    ingredients: ['2 oz Tequila', '0.5 oz Lime Juice', 'Grapefruit Soda', 'Salt rim (optional)'],
    instructions: '1. Build in a highball over ice\n2. Add tequila and lime\n3. Top with grapefruit soda\n4. Salt rim optional',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '28',
    name: 'Aperol Spritz',
    category: 'Cocktail',
    ingredients: ['3 oz Prosecco', '2 oz Aperol', '1 oz Soda Water', 'Orange slice'],
    instructions: '1. Build in a wine glass with ice\n2. Add prosecco, aperol, soda\n3. Garnish with orange',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '29',
    name: 'Bellini',
    category: 'Cocktail',
    ingredients: ['2 oz Peach Purée', '4 oz Prosecco'],
    instructions: '1. Add peach purée to flute\n2. Top slowly with prosecco\n3. Gently stir',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '35',
    name: 'Long Island Iced Tea',
    category: 'Cocktail',
    ingredients: ['0.5 oz Vodka', '0.5 oz Rum', '0.5 oz Gin', '0.5 oz Tequila', '0.5 oz Triple Sec', '0.75 oz Lemon Juice', 'Cola splash'],
    instructions: '1. Build over ice\n2. Top with cola\n3. Stir gently\n4. Garnish with lemon',
    difficulty: 'Hard',
    prepTime: '4 min'
  },
  {
    id: '36',
    name: 'Kir Royale',
    category: 'Cocktail',
    ingredients: ['0.5 oz Crème de Cassis', '4 oz Champagne'],
    instructions: '1. Add cassis to flute\n2. Top with champagne',
    difficulty: 'Easy',
    prepTime: '1 min'
  },
  {
    id: '37',
    name: 'Mimosa',
    category: 'Cocktail',
    ingredients: ['3 oz Champagne', '3 oz Orange Juice'],
    instructions: '1. Add orange juice to flute\n2. Top with champagne',
    difficulty: 'Easy',
    prepTime: '1 min'
  },
  {
    id: '38',
    name: 'Pisco Sour',
    category: 'Cocktail',
    ingredients: ['2 oz Pisco', '1 oz Lime Juice', '0.75 oz Simple Syrup', '1 Egg White', 'Bitters (dash)'],
    instructions: '1. Dry shake\n2. Shake with ice\n3. Strain into coupe\n4. Bitters on foam',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  // Whiskey
  {
    id: '6',
    name: 'Whiskey Sour',
    category: 'Whiskey',
    ingredients: ['2 oz Bourbon', '0.75 oz Lemon Juice', '0.5 oz Simple Syrup', 'Egg white (optional)', 'Bitters (optional)'],
    instructions: '1. Dry shake (if egg white)\n2. Shake with ice\n3. Strain over fresh ice or up\n4. Bitters optional',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '7',
    name: 'Manhattan',
    category: 'Whiskey',
    ingredients: ['2 oz Rye Whiskey', '1 oz Sweet Vermouth', '2 dashes Angostura Bitters', 'Cherry'],
    instructions: '1. Stir with ice\n2. Strain into coupe\n3. Garnish with cherry',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '8',
    name: 'Mint Julep',
    category: 'Whiskey',
    ingredients: ['2.5 oz Bourbon', '0.5 oz Simple Syrup', '8-10 Mint Leaves', 'Crushed Ice'],
    instructions: '1. Muddle mint with syrup\n2. Add bourbon, crushed ice\n3. Stir until frosty\n4. Garnish with mint',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '9',
    name: 'Boulevardier',
    category: 'Whiskey',
    ingredients: ['1.25 oz Bourbon', '1 oz Campari', '1 oz Sweet Vermouth', 'Orange peel'],
    instructions: '1. Stir with ice\n2. Strain over ice or up\n3. Express orange peel',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '10',
    name: 'Sazerac',
    category: 'Whiskey',
    ingredients: ['2 oz Rye Whiskey', '1 Sugar Cube', '3 dashes Peychaud’s Bitters', 'Absinthe Rinse', 'Lemon peel'],
    instructions: '1. Rinse glass with absinthe\n2. Muddle sugar/bitters\n3. Add rye and ice, stir\n4. Strain, lemon peel',
    difficulty: 'Hard',
    prepTime: '5 min'
  },
  {
    id: '33',
    name: 'Irish Coffee',
    category: 'Whiskey',
    ingredients: ['1.5 oz Irish Whiskey', '4 oz Hot Coffee', '1 oz Brown Sugar Syrup', 'Lightly Whipped Cream'],
    instructions: '1. Warm mug\n2. Add whiskey and syrup\n3. Top with coffee\n4. Float cream',
    difficulty: 'Easy',
    prepTime: '4 min'
  },
  // Rum
  {
    id: '11',
    name: 'Daiquiri',
    category: 'Rum',
    ingredients: ['2 oz White Rum', '1 oz Lime Juice', '0.75 oz Simple Syrup'],
    instructions: '1. Shake with ice\n2. Strain into coupe',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '12',
    name: 'Piña Colada',
    category: 'Rum',
    ingredients: ['2 oz White Rum', '2 oz Pineapple Juice', '1.5 oz Cream of Coconut'],
    instructions: '1. Blend with ice or shake\n2. Serve in hurricane glass',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '13',
    name: 'Mai Tai',
    category: 'Rum',
    ingredients: ['1 oz White Rum', '1 oz Dark Rum', '0.5 oz Orange Curaçao', '0.75 oz Lime Juice', '0.5 oz Orgeat'],
    instructions: '1. Shake except dark rum\n2. Strain over ice\n3. Float dark rum',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '14',
    name: "Dark 'n' Stormy",
    category: 'Rum',
    ingredients: ['2 oz Dark Rum', 'Ginger Beer', '0.5 oz Lime Juice (optional)'],
    instructions: '1. Build over ice\n2. Top with ginger beer\n3. Lime optional',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '15',
    name: 'Cuba Libre',
    category: 'Rum',
    ingredients: ['2 oz White Rum', 'Cola', '0.5 oz Lime Juice', 'Lime wedge'],
    instructions: '1. Build over ice\n2. Squeeze lime\n3. Top with cola',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '32',
    name: 'Hurricane',
    category: 'Rum',
    ingredients: ['2 oz Dark Rum', '1 oz Passion Fruit Syrup', '1 oz Lemon Juice', '0.5 oz Simple Syrup'],
    instructions: '1. Shake with ice\n2. Strain over fresh ice',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  // Gin
  {
    id: '16',
    name: 'Gin Martini',
    category: 'Gin',
    ingredients: ['2.5 oz Gin', '0.5 oz Dry Vermouth', 'Olive or Lemon Twist'],
    instructions: '1. Stir with ice\n2. Strain into coupe\n3. Garnish with olive or twist',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '17',
    name: 'Tom Collins',
    category: 'Gin',
    ingredients: ['2 oz Gin', '1 oz Lemon Juice', '0.5 oz Simple Syrup', 'Soda Water'],
    instructions: '1. Build over ice\n2. Top with soda\n3. Stir gently',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '18',
    name: 'Gin and Tonic',
    category: 'Gin',
    ingredients: ['2 oz Gin', 'Tonic Water', 'Lime wedge'],
    instructions: '1. Build over ice\n2. Top with tonic\n3. Garnish with lime',
    difficulty: 'Easy',
    prepTime: '1 min'
  },
  {
    id: '19',
    name: 'Gimlet',
    category: 'Gin',
    ingredients: ['2 oz Gin', '0.75 oz Lime Juice', '0.5 oz Simple Syrup'],
    instructions: '1. Shake with ice\n2. Strain into coupe',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '20',
    name: 'French 75',
    category: 'Gin',
    ingredients: ['1 oz Gin', '0.5 oz Lemon Juice', '0.5 oz Simple Syrup', '3 oz Champagne'],
    instructions: '1. Shake first three\n2. Strain into flute\n3. Top with champagne',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  {
    id: '31',
    name: "Bee's Knees",
    category: 'Gin',
    ingredients: ['2 oz Gin', '0.75 oz Lemon Juice', '0.75 oz Honey Syrup'],
    instructions: '1. Shake with ice\n2. Strain into coupe',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  // Vodka
  {
    id: '21',
    name: 'Moscow Mule',
    category: 'Vodka',
    ingredients: ['2 oz Vodka', 'Ginger Beer', '0.5 oz Lime Juice'],
    instructions: '1. Build over ice in copper mug\n2. Top with ginger beer\n3. Lime wedge',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '22',
    name: 'White Russian',
    category: 'Vodka',
    ingredients: ['2 oz Vodka', '1 oz Coffee Liqueur', '1 oz Cream'],
    instructions: '1. Build over ice\n2. Float cream and stir',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '23',
    name: 'Bloody Mary',
    category: 'Vodka',
    ingredients: ['2 oz Vodka', '4 oz Tomato Juice', '0.5 oz Lemon Juice', 'Worcestershire', 'Hot sauce', 'Salt & Pepper'],
    instructions: '1. Build over ice\n2. Season to taste\n3. Stir well\n4. Garnish as desired',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '24',
    name: 'Espresso Martini',
    category: 'Vodka',
    ingredients: ['1.5 oz Vodka', '1 oz Espresso (fresh)', '0.75 oz Coffee Liqueur', '0.25 oz Simple Syrup'],
    instructions: '1. Shake hard with ice\n2. Strain into coupe\n3. Garnish with coffee beans',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '25',
    name: 'Sea Breeze',
    category: 'Vodka',
    ingredients: ['1.5 oz Vodka', '4 oz Cranberry Juice', '1 oz Grapefruit Juice', 'Lime wedge'],
    instructions: '1. Build over ice\n2. Stir gently\n3. Garnish with lime',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  // Tequila
  {
    id: '40',
    name: 'Tequila Sunrise',
    category: 'Tequila',
    ingredients: ['2 oz Tequila', '4 oz Orange Juice', '0.5 oz Grenadine', 'Orange slice', 'Cherry'],
    instructions: '1. Build tequila and OJ over ice\n2. Slowly pour grenadine to sink\n3. Garnish with orange and cherry',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '41',
    name: "Tommy's Margarita",
    category: 'Tequila',
    ingredients: ['2 oz Tequila', '1 oz Lime Juice', '0.5 oz Agave Syrup'],
    instructions: '1. Shake with ice\n2. Strain over fresh ice\n3. Lime wedge garnish',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '42',
    name: 'Ranch Water',
    category: 'Tequila',
    ingredients: ['2 oz Tequila', 'Topo Chico (or Soda Water)', '0.75 oz Lime Juice', 'Lime wedge'],
    instructions: '1. Build over ice in Collins\n2. Top with sparkling water\n3. Garnish with lime',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '43',
    name: 'Tequila Old Fashioned',
    category: 'Tequila',
    ingredients: ['2 oz Reposado Tequila', '0.25 oz Agave Syrup', '2 dashes Angostura Bitters', 'Orange peel'],
    instructions: '1. Stir with ice\n2. Strain over large ice\n3. Express orange peel',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  {
    id: '44',
    name: 'El Diablo',
    category: 'Tequila',
    ingredients: ['1.5 oz Tequila', '0.5 oz Crème de Cassis', '0.75 oz Lime Juice', 'Ginger Beer'],
    instructions: '1. Build over ice\n2. Top with ginger beer\n3. Stir gently',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  // Brandy
  {
    id: '45',
    name: 'Brandy Alexander',
    category: 'Brandy',
    ingredients: ['1.5 oz Brandy', '1 oz Dark Crème de Cacao', '1 oz Cream', 'Nutmeg'],
    instructions: '1. Shake with ice\n2. Strain into coupe\n3. Grate nutmeg on top',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  {
    id: '46',
    name: 'Vieux Carré',
    category: 'Brandy',
    ingredients: ['0.75 oz Rye Whiskey', '0.75 oz Brandy', '0.75 oz Sweet Vermouth', '0.25 oz Bénédictine', 'Bitters'],
    instructions: '1. Stir with ice\n2. Strain over fresh ice\n3. Lemon or cherry garnish',
    difficulty: 'Hard',
    prepTime: '4 min'
  },
  {
    id: '47',
    name: 'Stinger',
    category: 'Brandy',
    ingredients: ['2 oz Brandy', '1 oz White Crème de Menthe'],
    instructions: '1. Shake or stir with ice\n2. Strain into coupe or over ice',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '48',
    name: 'Brandy Sour',
    category: 'Brandy',
    ingredients: ['2 oz Brandy', '0.75 oz Lemon Juice', '0.5 oz Simple Syrup', 'Bitters (optional)'],
    instructions: '1. Shake with ice\n2. Strain over fresh ice',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '49',
    name: 'Between the Sheets',
    category: 'Brandy',
    ingredients: ['1 oz Brandy', '1 oz White Rum', '1 oz Triple Sec', '0.75 oz Lemon Juice'],
    instructions: '1. Shake with ice\n2. Strain into coupe',
    difficulty: 'Medium',
    prepTime: '3 min'
  },
  // Non-Alcoholic
  {
    id: '50',
    name: 'Virgin Mojito',
    category: 'Non-Alcoholic',
    ingredients: ['6-8 Mint leaves', '0.75 oz Lime Juice', '0.5 oz Simple Syrup', 'Soda Water'],
    instructions: '1. Muddle mint with syrup\n2. Add lime and ice\n3. Top with soda',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '51',
    name: 'Shirley Temple',
    category: 'Non-Alcoholic',
    ingredients: ['Ginger Ale or Lemon-Lime Soda', '0.5 oz Grenadine', 'Cherry'],
    instructions: '1. Build over ice\n2. Add grenadine\n3. Garnish with cherry',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '52',
    name: 'Arnold Palmer',
    category: 'Non-Alcoholic',
    ingredients: ['Iced Tea', 'Lemonade', 'Lemon wheel'],
    instructions: '1. Build over ice (half tea, half lemonade)\n2. Garnish with lemon',
    difficulty: 'Easy',
    prepTime: '1 min'
  },
  {
    id: '53',
    name: 'Cucumber Cooler (NA)',
    category: 'Non-Alcoholic',
    ingredients: ['Cucumber slices', '0.75 oz Lime Juice', '0.5 oz Simple Syrup', 'Soda Water', 'Mint (optional)'],
    instructions: '1. Muddle cucumber (and mint)\n2. Add lime, syrup, ice\n3. Top with soda',
    difficulty: 'Easy',
    prepTime: '3 min'
  },
  {
    id: '54',
    name: 'Virgin Piña Colada',
    category: 'Non-Alcoholic',
    ingredients: ['2 oz Pineapple Juice', '1.5 oz Cream of Coconut', 'Ice'],
    instructions: '1. Blend or shake with ice\n2. Serve in hurricane glass',
    difficulty: 'Easy',
    prepTime: '3 min'
  }
];

export function getDrinkById(id: string): Drink | undefined {
  return DRINKS.find(d => d.id === id);
}