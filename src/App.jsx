import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { INITIAL_PANTRY, INITIAL_SHOPPING_LIST, INITIAL_PREFERENCES, INITIAL_RECIPES } from './constants.js'
import { applyActions } from './utils/actions.js'
import { requestPermission, checkPantryAlerts, sendNotification } from './utils/notifications.js'
import { ensureUser, pushToSupabase, pullFromSupabase } from './utils/sync.js'
import PantryTab from './components/PantryTab.jsx'
import ShoppingTab from './components/ShoppingTab.jsx'
import RecipesTab from './components/RecipesTab.jsx'
import AssistantTab from './components/AssistantTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'

const TABS = [
  { id: 'pantry', label: 'Pantry', icon: '🥦' },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'recipes', label: 'Recipes', icon: '👨‍🍳' },
  { id: 'assistant', label: 'Assistant', icon: '💬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

// sync status: 'idle' | 'syncing' | 'synced'
function SyncDot({ status }) {
  if (status === 'idle') return null
  return (
    <div style={{
      position: 'fixed',
      top: 12,
      right: 16,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 9px 3px 6px',
      boxShadow: 'var(--shadow-sm)',
      fontSize: 11,
      color: 'var(--color-text-muted)',
      pointerEvents: 'none',
    }}>
      {status === 'syncing' ? (
        <>
          <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
          Syncing
        </>
      ) : (
        <>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          Synced
        </>
      )}
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pantry')
  const [pantry, setPantry] = useLocalStorage('pantry_v1', INITIAL_PANTRY)
  const [shoppingList, setShoppingList] = useLocalStorage('shopping_v1', INITIAL_SHOPPING_LIST)
  const [recipes, setRecipes] = useLocalStorage('recipes_v1', INITIAL_RECIPES)
  const [preferences, setPreferences] = useLocalStorage('prefs_v1', INITIAL_PREFERENCES)
  const [userId, setUserId] = useLocalStorage('user_id_v1', null)
  const [syncStatus, setSyncStatus] = useState('idle')

  const debounceRef = useRef(null)
  const pantryRef = useRef(pantry)
  const shoppingRef = useRef(shoppingList)
  pantryRef.current = pantry
  shoppingRef.current = shoppingList

  const appState = { pantry, shoppingList, preferences }

  // ── Notifications ──────────────────────────────────────────────
  useEffect(() => {
    requestPermission()
  }, [])

  useEffect(() => {
    if (!preferences.notificationsEnabled) return
    function runAlerts() {
      const alerts = checkPantryAlerts(pantry)
      if (alerts.length > 0) sendNotification('Pantry alert', alerts.join(' · '))
    }
    runAlerts()
    const interval = setInterval(runAlerts, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [pantry, preferences.notificationsEnabled])

  // ── Supabase: sign in + initial pull ───────────────────────────
  useEffect(() => {
    async function init() {
      const uid = await ensureUser()
      if (!uid) return
      setUserId(uid)

      setSyncStatus('syncing')
      const remote = await pullFromSupabase(uid)
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus('idle'), 2000)

      if (remote) {
        if (remote.pantry) setPantry(remote.pantry)
        if (remote.shoppingList) setShoppingList(remote.shoppingList)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase: debounced push on data change ────────────────────
  const schedulePush = useCallback(() => {
    if (!userId) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSyncStatus('syncing')
      await pushToSupabase(userId, pantryRef.current, shoppingRef.current)
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus('idle'), 2000)
    }, 2000)
  }, [userId])

  useEffect(() => { schedulePush() }, [pantry, shoppingList, schedulePush])

  // ── Pantry actions ─────────────────────────────────────────────
  const addPantryItem = (item) => setPantry(prev => [...prev, item])

  const updatePantryItem = (updated) =>
    setPantry(prev => prev.map(i => i.id === updated.id ? updated : i))

  const deletePantryItem = (id) =>
    setPantry(prev => prev.filter(i => i.id !== id))

  const deleteAllPantryItems = () => setPantry([])

  const deletePantryCategory = (category) =>
    setPantry(prev => prev.filter(i => i.category !== category))

  // ── Shopping list actions ──────────────────────────────────────
  const addShoppingItem = (item) => {
    const exists = shoppingList.find(i => i.name.toLowerCase() === item.name.toLowerCase())
    if (!exists) {
      setShoppingList(prev => [...prev, { ...item, id: uuid(), addedBy: 'user', addedAt: new Date().toISOString() }])
    }
  }

  const toggleShoppingItem = (id) =>
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))

  const deleteShoppingItem = (id) =>
    setShoppingList(prev => prev.filter(i => i.id !== id))

  const deleteAllShoppingItems = () => setShoppingList([])

  // ── Recipe actions ─────────────────────────────────────────────
  const deleteRecipe = (id) => setRecipes(prev => prev.filter(r => r.id !== id))
  const deleteRecipes = (ids) => setRecipes(prev => prev.filter(r => !ids.includes(r.id)))
  const deleteAllRecipes = () => setRecipes([])

  // ── Settings actions ───────────────────────────────────────────
  const updatePreferences = (updated) => setPreferences(updated)

  const resetData = () => {
    setPantry(INITIAL_PANTRY)
    setShoppingList(INITIAL_SHOPPING_LIST)
    setRecipes(INITIAL_RECIPES)
  }

  // ── AI state change ────────────────────────────────────────────
  const handleStateChange = (nextState) => {
    setPantry(nextState.pantry)
    setShoppingList(nextState.shoppingList)
  }

  const shoppingBadge = shoppingList.filter(i => !i.checked).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <SyncDot status={syncStatus} />

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'pantry' && (
          <PantryTab
            pantry={pantry}
            onAddItem={addPantryItem}
            onUpdateItem={updatePantryItem}
            onDeleteItem={deletePantryItem}
            onDeleteAll={deleteAllPantryItems}
            onDeleteCategory={deletePantryCategory}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingTab
            shoppingList={shoppingList}
            onToggle={toggleShoppingItem}
            onDelete={deleteShoppingItem}
            onDeleteAll={deleteAllShoppingItems}
            onAdd={addShoppingItem}
            pantry={pantry}
            addPantryItem={addPantryItem}
            updatePantryItem={updatePantryItem}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesTab
            pantry={pantry}
            recipes={recipes}
            onAddToShoppingList={addShoppingItem}
            onDeleteRecipe={deleteRecipe}
            onDeleteRecipes={deleteRecipes}
            onDeleteAllRecipes={deleteAllRecipes}
          />
        )}
        {activeTab === 'assistant' && (
          <AssistantTab
            appState={appState}
            onStateChange={handleStateChange}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            preferences={preferences}
            onUpdate={updatePreferences}
            onResetData={resetData}
          />
        )}
      </div>

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>
              {tab.label}
              {tab.id === 'shopping' && shoppingBadge > 0 && (
                <span style={{
                  marginLeft: 4,
                  background: 'var(--color-accent)',
                  color: 'white',
                  borderRadius: 10,
                  fontSize: 9,
                  padding: '1px 5px',
                  fontWeight: 700,
                }}>
                  {shoppingBadge}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
