import { useState, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { INITIAL_PANTRY, INITIAL_SHOPPING_LIST, INITIAL_PREFERENCES, INITIAL_RECIPES } from './constants.js'
import { applyActions } from './utils/actions.js'
import { requestPermission, checkPantryAlerts, sendNotification } from './utils/notifications.js'
import { pushToSupabase, pullFromSupabase } from './utils/sync.js'
import { supabase, getOrCreateHouseholdId } from './utils/supabase.js'
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

// status: 'idle' | 'syncing' | 'synced' | 'error'
function SyncIndicator({ status, shared }) {
  const colors = {
    idle: '#D1D5DB',
    syncing: '#22c55e',
    synced: '#22c55e',
    error: '#EF4444',
  }
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 14,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      pointerEvents: 'none',
    }}>
      {shared && (
        <span style={{ fontSize: 12, lineHeight: 1 }}>👥</span>
      )}
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status] ?? colors.idle,
        animation: status === 'syncing' ? 'sync-pulse 1s ease-in-out infinite' : 'none',
        transition: 'background 0.3s',
      }} />
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pantry')
  const [pantry, setPantry] = useLocalStorage('pantry_v1', INITIAL_PANTRY)
  const [shoppingList, setShoppingList] = useLocalStorage('shopping_v1', INITIAL_SHOPPING_LIST)
  const [recipes, setRecipes] = useLocalStorage('recipes_v1', INITIAL_RECIPES)
  const [preferences, setPreferences] = useLocalStorage('prefs_v1', INITIAL_PREFERENCES)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [householdId, setHouseholdId] = useState(() => getOrCreateHouseholdId())

  const debounceRef = useRef(null)
  const pantryRef = useRef(pantry)
  const shoppingRef = useRef(shoppingList)
  const isRemoteUpdateRef = useRef(false)
  const channelRef = useRef(null)
  pantryRef.current = pantry
  shoppingRef.current = shoppingList

  const appState = { pantry, shoppingList, preferences }

  // Whether this device has joined a shared household (not a freshly generated ID)
  const isSharedHousehold = localStorage.getItem('household_joined') === 'true'

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

  // ── Supabase: pull + subscribe whenever householdId changes ────
  useEffect(() => {
    // Initial pull
    async function init() {
      try {
        setSyncStatus('syncing')
        const remote = await pullFromSupabase(householdId)
        if (remote.pantry) { isRemoteUpdateRef.current = true; setPantry(remote.pantry) }
        if (remote.shoppingList) { isRemoteUpdateRef.current = true; setShoppingList(remote.shoppingList) }
        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    }
    init()

    // Realtime subscription
    try {
      if (channelRef.current) supabase.removeChannel(channelRef.current)

      channelRef.current = supabase
        .channel('household-sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'pantry', filter: `id=eq.${householdId}` },
          (payload) => {
            if (payload.new?.data) {
              isRemoteUpdateRef.current = true
              setPantry(payload.new.data)
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'shopping_list', filter: `id=eq.${householdId}` },
          (payload) => {
            if (payload.new?.data) {
              isRemoteUpdateRef.current = true
              setShoppingList(payload.new.data)
            }
          }
        )
        .subscribe()
    } catch {
      // Fail silently — realtime is an enhancement
    }

    return () => {
      try {
        if (channelRef.current) supabase.removeChannel(channelRef.current)
      } catch { /* ignore */ }
    }
  }, [householdId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase: debounced push on local data change ──────────────
  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setSyncStatus('syncing')
        await pushToSupabase(pantryRef.current, shoppingRef.current)
        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    }, 2000)
  }, [pantry, shoppingList])

  // ── Join household ─────────────────────────────────────────────
  const handleJoinHousehold = async (newId) => {
    localStorage.setItem('household_id_v1', newId)
    localStorage.setItem('household_joined', 'true')
    setHouseholdId(newId)
    // Data will be pulled in the householdId effect above
  }

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
      <SyncIndicator status={syncStatus} shared={isSharedHousehold} />

      <style>{`
        @keyframes sync-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>

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
            householdId={householdId}
            onJoinHousehold={handleJoinHousehold}
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
