// Simple units for pantry stock tracking
export const PANTRY_UNITS = ['units', 'pack', 'g', 'kg', 'ml', 'l', 'oz', 'lb']

// Detailed units for recipes and cooking
export const RECIPE_UNITS = ['units', 'g', 'kg', 'ml', 'l', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'loaf', 'bunch', 'pack']

export const CATEGORIES = [
  'produce',
  'dairy',
  'meat & fish',
  'dry goods & grains',
  'canned & jarred',
  'condiments & sauces',
  'frozen',
  'snacks & sweets',
  'beverages',
  'bakery',
  'other',
]

export const CATEGORY_ICONS = {
  'produce': '🥦',
  'dairy': '🥛',
  'meat & fish': '🥩',
  'dry goods & grains': '🌾',
  'canned & jarred': '🥫',
  'condiments & sauces': '🧴',
  'frozen': '🧊',
  'snacks & sweets': '🍪',
  'beverages': '☕',
  'bakery': '🍞',
  'other': '📦',
}

export const getSystemPrompt = (lang = 'en') => `You are a friendly, knowledgeable kitchen assistant built into a personal grocery and pantry app.
You are concise, warm, and practical — like a helpful friend who knows their way around a kitchen.

You have access to the user's current app state, provided below in JSON:
- pantry: their current pantry inventory (items, quantities, expiry dates)
- shoppingList: their active shopping list
- preferences: their cuisine preferences, skill level, and household size

## Your capabilities:
- Add or remove items from the pantry or shopping list
- Suggest recipes based on what's in the pantry
- Log usage of pantry items (e.g. "I used 2 cups of flour")
- Answer cooking questions
- Be proactive about low stock — if you notice something is low or expiring soon, mention it briefly

## Response rules:
- Keep responses short and actionable unless the user asks for detail
- When suggesting recipes, always check pantry contents first
- When adding to the shopping list, confirm what you added
- When a user asks for a recipe, ask whether they want "use what I have" or "full recipe with missing items added to list" — unless they've already specified
- Never invent pantry items that aren't in the provided state
- If the user overrides a preference on the fly (e.g. "make it for 4 people"), honour that for this response only — don't permanently change their preferences

## Output format for structured actions:
When you need to modify app state, include a JSON block at the end of your response in this format:

\`\`\`json
{
  "actions": [
    { "type": "ADD_TO_SHOPPING_LIST", "item": { "name": "...", "quantity": 1, "unit": "...", "category": "..." } },
    { "type": "UPDATE_PANTRY_ITEM", "id": "...", "changes": { "quantity": 3 } },
    { "type": "REMOVE_FROM_PANTRY", "id": "..." },
    { "type": "ADD_TO_PANTRY", "item": { "name": "...", "category": "...", "quantity": 1, "unit": "units", "lowStockThreshold": 1, "source": "ai" } }
  ]
}
\`\`\`

Only include this block if state needs to change. Omit it for conversational replies.

## Language
Always respond in ${lang === 'el' ? 'Greek (Ελληνικά)' : 'English'}.
This is the default language of the app the user is using.
If the user writes to you in a different language, respond in that language instead — but always default to ${lang === 'el' ? 'Greek' : 'English'} unless they specify otherwise.`

export const INITIAL_PANTRY = [
  {
    id: '1', name: 'Olive Oil', brand: 'Filippo Berio', category: 'condiments & sauces',
    quantity: 300, unit: 'ml', lowStockThreshold: 100,
    expiryDate: '2026-06-01', addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '2', name: 'Pasta (Spaghetti)', brand: 'Barilla', category: 'dry goods & grains',
    quantity: 500, unit: 'g', lowStockThreshold: 100,
    addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '3', name: 'Eggs', category: 'dairy',
    quantity: 4, unit: 'units', lowStockThreshold: 3,
    expiryDate: '2026-04-10', addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '4', name: 'Parmesan', brand: 'Grana Padano', category: 'dairy',
    quantity: 80, unit: 'g', lowStockThreshold: 50,
    expiryDate: '2026-05-01', addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '5', name: 'Pancetta', category: 'meat & fish',
    quantity: 150, unit: 'g', lowStockThreshold: 50,
    expiryDate: '2026-04-05', addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '6', name: 'Garlic', category: 'produce',
    quantity: 3, unit: 'units', lowStockThreshold: 2,
    addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '7', name: 'Whole Milk', brand: 'Delta', category: 'dairy',
    quantity: 200, unit: 'ml', lowStockThreshold: 250,
    expiryDate: '2026-04-03', addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '8', name: 'Cherry Tomatoes', category: 'produce',
    quantity: 200, unit: 'g', lowStockThreshold: 100,
    addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '9', name: 'Sea Salt', category: 'condiments & sauces',
    quantity: 400, unit: 'g', lowStockThreshold: 50,
    addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
  {
    id: '10', name: 'Black Pepper', category: 'condiments & sauces',
    quantity: 30, unit: 'g', lowStockThreshold: 20,
    addedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), source: 'manual'
  },
]

export const INITIAL_SHOPPING_LIST = [
  {
    id: 'sl1', name: 'Oat Milk', quantity: 1, unit: 'litre', category: 'beverages',
    checked: false, addedBy: 'user', addedAt: new Date().toISOString()
  },
  {
    id: 'sl2', name: 'Sourdough Bread', quantity: 1, unit: 'loaf', category: 'bakery',
    checked: false, addedBy: 'user', addedAt: new Date().toISOString()
  },
]

export const INITIAL_RECIPES = [
  {
    id: 'r1',
    title: 'Spaghetti alla Carbonara',
    cuisine: 'Italian',
    skillLevel: 'intermediate',
    servings: 2,
    estimatedTimeMinutes: 25,
    ingredients: [
      { name: 'Pasta (Spaghetti)', quantity: 200, unit: 'g' },
      { name: 'Pancetta', quantity: 100, unit: 'g' },
      { name: 'Eggs', quantity: 3, unit: 'units' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
      { name: 'Black Pepper', quantity: 1, unit: 'tsp' },
      { name: 'Sea Salt', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Bring a large pot of salted water to a boil. Cook spaghetti until al dente.',
      'In a bowl, whisk together eggs, grated parmesan, and plenty of black pepper.',
      'Fry pancetta in a pan until crispy. Reserve the fat.',
      'Drain pasta, reserving a cup of pasta water.',
      'Off the heat, toss pasta with pancetta and fat, then quickly add egg mixture.',
      'Add pasta water gradually to create a creamy sauce. Season and serve immediately.',
    ],
    source: 'ai-generated',
  },
  {
    id: 'r2',
    title: 'Cherry Tomato Bruschetta',
    cuisine: 'Italian',
    skillLevel: 'beginner',
    servings: 2,
    estimatedTimeMinutes: 15,
    ingredients: [
      { name: 'Cherry Tomatoes', quantity: 200, unit: 'g' },
      { name: 'Garlic', quantity: 2, unit: 'units' },
      { name: 'Olive Oil', quantity: 3, unit: 'tbsp' },
      { name: 'Sea Salt', quantity: 0.5, unit: 'tsp' },
      { name: 'Sourdough Bread', quantity: 4, unit: 'slices' },
    ],
    steps: [
      'Halve the cherry tomatoes and mince the garlic.',
      'Toss tomatoes with olive oil, garlic, salt, and pepper. Let sit 10 minutes.',
      'Toast or grill the bread slices until golden.',
      'Rub toast with a cut garlic clove, then spoon the tomato mixture over.',
      'Drizzle with extra olive oil and serve immediately.',
    ],
    source: 'ai-generated',
  },
]

export const INITIAL_PREFERENCES = {
  cuisines: ['Italian', 'Mediterranean', 'Asian'],
  skillLevel: 'intermediate',
  householdSize: 2,
  lowStockThreshold: 2,
  voiceEnabled: false,
  notificationsEnabled: true,
}
