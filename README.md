# 🥦 Pantry & Groceries

An AI-powered PWA for managing your home pantry, shopping lists, and recipes.

## Features

- **Pantry** — track items, quantities, expiry dates, low stock alerts
- **Shopping List** — manual or AI-generated, organised by category
- **Recipes** — ingredient-aware suggestions, add missing items to list
- **AI Assistant** — Claude-powered chat that reads your pantry and updates it
- **Settings** — cuisine preferences, household size, cooking skill, voice input toggle, pantry alert notifications
- **Cloud Sync** — real-time sync across devices via Supabase; share a household with an invite code
- **Push Notifications** — alerts for expiring or low-stock pantry items
- **Voice Input** — speak to add items or chat with the assistant (Web Speech API)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API keys
```bash
cp .env.example .env
```
Edit `.env` and fill in your keys:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
- Anthropic key: [console.anthropic.com](https://console.anthropic.com)
- Supabase credentials: [supabase.com/dashboard](https://supabase.com/dashboard) → your project → Settings → API

### 3. Run locally
```bash
npm run dev
```
Open `http://localhost:5173`

---

## Deploy to Vercel (recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In Vercel project settings → Environment Variables → add:
   - `VITE_ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
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
│   ├── useLocalStorage.js     # Persistent state hook
│   └── useSpeechRecognition.js # Web Speech API hook
├── utils/
│   ├── assistant.js           # Claude API call + response parsing
│   ├── actions.js             # applyActions (AI → state mutations)
│   ├── notifications.js       # Push notification helpers
│   ├── supabase.js            # Supabase client + household ID
│   └── sync.js                # pushToSupabase / pullFromSupabase
└── components/
    ├── PantryTab.jsx           # Pantry list, search, edit/delete
    ├── ShoppingTab.jsx         # Shopping list, check off, categories
    ├── RecipesTab.jsx          # Recipe cards, ingredient check
    ├── AssistantTab.jsx        # AI chat interface
    ├── SettingsTab.jsx         # Preferences, household sync, data reset
    ├── BarcodeScanner.jsx      # Camera scanner + Open Food Facts
    ├── AddItemModal.jsx        # Add pantry item (manual or scan)
    └── EditItemModal.jsx       # Edit/delete pantry item
```

---

## Data

All data is stored in `localStorage` under these keys:
- `pantry_v1` — pantry items array
- `shopping_v1` — shopping list array
- `recipes_v1` — saved recipes array
- `prefs_v1` — user preferences
- `household_id_v1` — Supabase household identifier

To reset to defaults, open browser DevTools → Application → Local Storage → delete those keys.

---

## Roadmap

- [x] Voice input (Web Speech API)
- [x] Settings screen (cuisine prefs, household size)
- [ ] Check-off items → auto-update pantry quantities
- [x] Cloud sync (Supabase)
- [x] Push notifications for expiring items
