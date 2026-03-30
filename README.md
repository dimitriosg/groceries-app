# 🥦 Pantry & Groceries

An AI-powered PWA for managing your home pantry, shopping lists, and recipes.

## Features

- **Pantry** — track items, quantities, expiry dates, low stock alerts
- **Shopping List** — manual or AI-generated, organised by category
- **Recipes** — ingredient-aware suggestions, add missing items to list
- **AI Assistant** — Claude-powered chat that reads your pantry and updates it

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Anthropic API key
```bash
cp .env.example .env
```
Edit `.env` and add your key:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```
Get a key at [console.anthropic.com](https://console.anthropic.com)

### 3. Run locally
```bash
npm run dev
```
Open `http://localhost:5173`

---

## Deploy to Vercel (recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In Vercel project settings → Environment Variables → add `VITE_ANTHROPIC_API_KEY`
4. Deploy

Once deployed, open the URL on your phone in Safari → *Share → Add to Home Screen* for the full PWA experience.

---

## Install as PWA (local dev)

For local PWA testing, use the preview build (service workers don't run in dev mode):
```bash
npm run build
npm run preview
```
Then open `http://localhost:4173` in Chrome or Safari and install from the browser menu.

---

## Project structure

```
src/
├── App.jsx                    # Tab routing + global state
├── constants.js               # System prompt, seed data, categories
├── index.css                  # Design tokens + global styles
├── hooks/
│   └── useLocalStorage.js     # Persistent state hook
├── utils/
│   ├── assistant.js           # Claude API call + response parsing
│   └── actions.js             # applyActions (AI → state mutations)
└── components/
    ├── PantryTab.jsx           # Pantry list, search, edit/delete
    ├── ShoppingTab.jsx         # Shopping list, check off, categories
    ├── RecipesTab.jsx          # Recipe cards, ingredient check
    ├── AssistantTab.jsx        # AI chat interface
    ├── BarcodeScanner.jsx      # Camera scanner + Open Food Facts
    ├── AddItemModal.jsx        # Add pantry item (manual or scan)
    └── EditItemModal.jsx       # Edit/delete pantry item
```

---

## Data

All data is stored in `localStorage` under these keys:
- `pantry_v1` — pantry items array
- `shopping_v1` — shopping list array
- `prefs_v1` — user preferences

To reset to defaults, open browser DevTools → Application → Local Storage → delete those keys.

---

## Roadmap

- [ ] Voice input (Web Speech API)
- [ ] Settings screen (cuisine prefs, household size)
- [ ] Check-off items → auto-update pantry quantities
- [ ] Cloud sync (Supabase)
- [ ] Push notifications for expiring items
