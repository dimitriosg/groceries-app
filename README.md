# 🥦 Pantry & Groceries

> **v1.0.1** — An AI-powered Progressive Web App for managing your home pantry, shopping lists, and recipes — with real-time cloud sync, barcode scanning, voice input, and full Greek/English support.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Setup & Installation](#setup--installation)
6. [Environment Variables](#environment-variables)
7. [Running Locally](#running-locally)
8. [Building for Production](#building-for-production)
9. [Deploy to Vercel](#deploy-to-vercel)
10. [Install as a PWA](#install-as-a-pwa)
11. [Supabase Database Setup](#supabase-database-setup)
12. [Project Structure](#project-structure)
13. [Architecture](#architecture)
14. [Data Storage](#data-storage)
15. [Internationalisation (i18n)](#internationalisation-i18n)
16. [Roadmap](#roadmap)

---

## Overview

**Pantry & Groceries** is a mobile-first PWA built with React + Vite. It keeps track of everything in your kitchen — what you have, what you need to buy, and what you can cook — and lets an AI assistant (Claude by Anthropic) read and update your pantry through natural conversation.

All data lives in `localStorage` for instant offline access and can optionally be synced across multiple devices via Supabase, so the whole household stays on the same page.

---

## Features

| Area | What it does |
|---|---|
| **Pantry** | Track items with quantities, units, categories, expiry dates, brand, and low-stock thresholds. Search, filter, bulk-delete by category. |
| **Shopping List** | Add items manually or let the AI generate a list for you. Items are organised by category. Check off items and optionally move them straight to the pantry. |
| **Recipes** | AI-generated recipe cards that know which ingredients you already have. See at a glance what is missing and add those items to the shopping list with one tap. |
| **AI Assistant** | Chat with Claude (claude-sonnet-4-5). The assistant sees your current pantry, shopping list, and preferences and can update them automatically via structured actions. Save, reload, and manage up to 20 conversation histories. |
| **Barcode Scanner** | Scan any product barcode with the device camera. Two-step flow: barcode is detected instantly with visual feedback (green frame + barcode number), then product details are looked up from [Open Food Facts](https://world.openfoodfacts.org/) — Greek endpoint first, global fallback. Results are pre-filled in the add-item form. Includes torch toggle. |
| **Voice Input** | Use the Web Speech API to speak item names or chat with the assistant hands-free. |
| **Push Notifications** | Get browser notifications for pantry items that are expiring soon or running low. |
| **Household Sync** | Real-time sync across devices via Supabase. Share a household by pasting an invite code on another device. Manage members, promote admins, change the household ID, or leave the household. |
| **Conflict Resolution** | When the same item is edited on two devices at nearly the same time, a UI prompt lets you choose which version to keep — item by item, or all at once. |
| **Offline Support** | The app works fully offline. A banner indicates offline/live status. Pending changes are pushed automatically when connectivity is restored. |
| **Settings** | Cuisine preferences, household size, cooking skill level (1–5), low-stock threshold, language, voice toggle, push notification toggle, and full data reset. |
| **Internationalisation** | UI is fully translated into **English** and **Greek (Ελληνικά)**. Switch language in Settings. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 18](https://react.dev/) |
| Build tool | [Vite 5](https://vitejs.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) |
| AI | [Anthropic Claude](https://www.anthropic.com/) (`claude-sonnet-4-5`) |
| Cloud sync | [Supabase](https://supabase.com/) (Postgres + REST) |
| Barcode scanning | [@zxing/browser](https://github.com/zxing-js/library) + [Open Food Facts API](https://world.openfoodfacts.org/data) |
| Analytics | [@vercel/analytics](https://vercel.com/analytics) + [@vercel/speed-insights](https://vercel.com/docs/speed-insights) |
| IDs | [uuid](https://github.com/uuidjs/uuid) |
| Styling | Plain CSS with design tokens (no CSS framework) |

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- An **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
- A **Supabase project** (free tier is enough) — [supabase.com](https://supabase.com)

---

## Setup & Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys (see [Environment Variables](#environment-variables) below).

### 3. Set up Supabase tables

See [Supabase Database Setup](#supabase-database-setup) for the SQL you need to run once in your Supabase project.

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`). Get it from [console.anthropic.com](https://console.anthropic.com). |
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://<project-ref>.supabase.co`). Found in your project → **Settings → API**. |
| `VITE_SUPABASE_ANON_KEY` | The public anon key for your Supabase project. Same location as above. |

> **⚠️ Security note:** These variables are embedded in the client bundle. The Anthropic key is sent directly from the browser to Anthropic's API. This is fine for personal or household use, but if you open the app to the public, proxy the Anthropic call through a server-side function instead.

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> Service workers (and therefore the full PWA experience) are **not** active in dev mode. See [Install as a PWA](#install-as-a-pwa) for local PWA testing.

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. The build includes a Workbox service worker that pre-caches all assets for offline use.

---

## Deploy to Vercel

Vercel is the recommended host because it pairs nicely with Supabase and gives you edge-close analytics out of the box.

1. Push this repository to GitHub (or fork it).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. In your Vercel project → **Settings → Environment Variables**, add:
   - `VITE_ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**.

Once the deployment is live, open the URL on your phone in **Safari** and tap **Share → Add to Home Screen** for the full native-app feel.

---

## Install as a PWA

### On a deployed URL (recommended)

- **iOS (Safari):** tap the Share icon → *Add to Home Screen*
- **Android (Chrome):** tap the three-dot menu → *Add to Home Screen* (or wait for the install prompt)
- **Desktop (Chrome/Edge):** click the install icon in the address bar

### Local dev / preview

Service workers are disabled in `npm run dev`. To test the full PWA locally:

```bash
npm run build
npm run preview
```

Open [http://localhost:4173](http://localhost:4173) and install from the browser menu as described above.

---

## Supabase Database Setup

Run the following SQL once in your Supabase project (**SQL Editor → New query**):

```sql
-- Pantry data per household
create table if not exists pantry (
  id text primary key,
  user_id text not null,
  data jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Shopping list data per household
create table if not exists shopping_list (
  id text primary key,
  user_id text not null,
  data jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Household members (devices)
create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id text not null,
  device_id text not null,
  role text not null default 'common',
  display_name text not null default 'Common User',
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

-- Redirect table for household ID changes
create table if not exists household_redirects (
  old_id text primary key,
  new_id text not null,
  created_at timestamptz not null default now()
);
```

> **Row-level security (RLS):** The app uses the anon key, so make sure your tables are accessible to anon with the appropriate insert/update/select policies, or simply disable RLS for a private household setup.

---

## Project Structure

```
groceries-app/
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── scripts/
│   └── generate-icons.js       # Utility to generate PWA icon PNGs
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Tab routing, global state, sync orchestration
│   ├── LangContext.jsx          # React context for active language
│   ├── i18n.js                  # All UI strings in EN + EL
│   ├── constants.js             # AI system prompt, seed data, item categories
│   ├── index.css                # CSS design tokens + global styles
│   ├── hooks/
│   │   ├── useLocalStorage.js       # Persistent state via localStorage
│   │   ├── useSpeechRecognition.js  # Web Speech API wrapper
│   │   ├── useNetworkStatus.js      # Online/offline detection
│   │   └── useTranslation.js        # t() helper that reads LangContext
│   ├── utils/
│   │   ├── assistant.js         # Calls Claude API, parses action blocks
│   │   ├── actions.js           # applyActions — maps AI actions → state mutations
│   │   ├── sync.js              # pushToSupabase / pullFromSupabase / member management
│   │   ├── supabase.js          # Supabase client initialisation + household ID
│   │   ├── conflictResolver.js  # Merges local + remote items, surfaces conflicts
│   │   └── notifications.js     # Push notification permission + scheduling
│   └── components/
│       ├── PantryTab.jsx        # Pantry list, search, add/edit/delete
│       ├── ShoppingTab.jsx      # Shopping list, check-off, category grouping
│       ├── RecipesTab.jsx       # Recipe cards, ingredient status, add-missing
│       ├── AssistantTab.jsx     # AI chat UI, conversation history
│       ├── SettingsTab.jsx      # Prefs, household sync, language, data reset
│       ├── BarcodeScanner.jsx   # ZXing camera scanner + Open Food Facts lookup
│       ├── AddItemModal.jsx     # Modal: add pantry item (manual or scanned)
│       ├── EditItemModal.jsx    # Modal: edit or delete a pantry item
│       ├── AppModal.jsx         # Generic reusable modal / dialog component
│       └── Toast.jsx            # Ephemeral notification toasts
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## Architecture

### AI flow

```
User message
    │
    ▼
callAssistant()          (utils/assistant.js)
    │   Sends: system prompt + full app state (pantry, shopping, prefs) + conversation history
    │   Model:  claude-sonnet-4-5
    ▼
Claude response
    │   Contains: plain text reply + optional ```json { "actions": [...] }``` block
    ▼
parseAssistantResponse()
    │   Splits display text from action payload
    ▼
applyActions()           (utils/actions.js)
    │   Mutates: pantry / shopping list / recipes state
    ▼
UI re-render + pushToSupabase()
```

**Supported AI actions:** `add_pantry_item`, `update_pantry_item`, `remove_pantry_item`, `add_shopping_item`, `remove_shopping_item`, `clear_shopping_list`, `add_recipe`, `remove_recipe`.

### Sync flow

```
App start / manual sync
    │
    ▼
pullFromSupabase()
    │   Fetches pantry + shopping_list rows for householdId
    │   Follows household_redirects if the ID has changed
    ▼
resolveConflicts()       (utils/conflictResolver.js)
    │   Items edited within 10 s of each other on two devices → conflict
    │   Others → newest lastUpdatedAt wins automatically
    ▼
ConflictResolutionModal (if any conflicts)
    │   User picks "yours" or "theirs" per item
    ▼
pushToSupabase()         (after every state change via App.jsx useEffect)
```

---

## Data Storage

All data is persisted in the browser's `localStorage`. No account is required to use the app.

| Key | Contents |
|---|---|
| `pantry_v1` | Array of pantry item objects |
| `shopping_v1` | Array of shopping list item objects |
| `recipes_v1` | Array of saved recipe objects |
| `prefs_v1` | User preferences (cuisine, skill, household size, thresholds, toggles) |
| `household_id_v1` | Supabase household identifier (auto-generated UUID by default) |
| `app_lang_v1` | Active UI language (`"en"` or `"el"`) |
| `assistant_convos_v1` | Saved conversation histories (max 20) |

**To wipe everything and start fresh:** open browser DevTools → **Application → Local Storage** → delete the keys above. Or use **Settings → Delete all data** inside the app.

---

## Internationalisation (i18n)

The app ships with full translations for **English (`en`)** and **Greek / Ελληνικά (`el`)**.

- All strings live in `src/i18n.js` as a `translations` object keyed by locale.
- Components access strings via the `useTranslation` hook which reads `LangContext`.
- The hook exposes three helpers:
  - `t(key)` — plain UI strings
  - `tUnit(key)` — translates stored English unit keys (e.g. `"units"` → `"τεμάχια"`)
  - `tCat(key)` — translates stored English category keys (e.g. `"dairy"` → `"Γαλακτοκομικά"`)
- Stored data always uses English keys internally; display labels are translated on the fly.
- The active language is stored in `localStorage` (`app_lang_v1`) and can be changed at any time under **Settings → Language**.

To add a new language, add a new locale key (including `units` and `categories` sub-objects) to `src/i18n.js` and add the corresponding option to the language selector in `SettingsTab.jsx`.

---

## Roadmap

- [x] Voice input (Web Speech API)
- [x] Settings screen (cuisine prefs, household size, cooking skill 1–5)
- [x] Cloud sync (Supabase)
- [x] Push notifications for expiring / low-stock items
- [x] Barcode scanning + Open Food Facts lookup (Greek endpoint first)
- [x] Two-step barcode detection — instant visual feedback before network lookup
- [x] Household member management (roles, admin promotion, leave, change ID)
- [x] Conflict resolution UI for multi-device edits
- [x] Offline support with sync-on-reconnect banner
- [x] Full Greek / English i18n (units + categories translated via tUnit/tCat)
- [x] Vercel Analytics + Speed Insights
- [x] App version display in Settings
- [ ] Check-off shopping items → auto-update pantry quantities
- [ ] Meal planner / weekly menu view
- [ ] Nutritional information from barcode scan
- [ ] Export pantry / shopping list as PDF or CSV
