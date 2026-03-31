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

export const SYSTEM_PROMPT = `You are a friendly, knowledgeable kitchen assistant built into a personal grocery and pantry app.
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

Only include this block if state needs to change. Omit it for conversational replies.`

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

export const INITIAL_PREFERENCES = {
  cuisines: ['Italian', 'Mediterranean', 'Asian'],
  skillLevel: 'intermediate',
  householdSize: 2,
  lowStockThreshold: 2,
  voiceEnabled: false,
}
