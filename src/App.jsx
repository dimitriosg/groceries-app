import { useState, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useTranslation } from './hooks/useTranslation.js'
import { useNetworkStatus } from './hooks/useNetworkStatus.js'
import { INITIAL_PANTRY, INITIAL_SHOPPING_LIST, INITIAL_PREFERENCES, INITIAL_RECIPES } from './constants.js'
import { applyActions } from './utils/actions.js'
import { requestPermission, checkPantryAlerts, sendNotification } from './utils/notifications.js'
import { pushToSupabase, pullFromSupabase, registerMember, leaveHousehold, changeHouseholdId as changeHouseholdIdInDb } from './utils/sync.js'
import { supabase, getOrCreateHouseholdId, getOrCreateDeviceId } from './utils/supabase.js'
import { resolveConflicts } from './utils/conflictResolver.js'
import PantryTab from './components/PantryTab.jsx'
import ShoppingTab from './components/ShoppingTab.jsx'
import RecipesTab from './components/RecipesTab.jsx'
import AssistantTab from './components/AssistantTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'
import Toast from './components/Toast.jsx'
import AppModal from './components/AppModal.jsx'

const TAB_IDS = ['pantry', 'shopping', 'recipes', 'assistant', 'settings']
const TAB_ICONS = { pantry: '🥦', shopping: '🛒', recipes: '👨‍🍳', assistant: '💬', settings: '⚙️' }

const INITIAL_GREETING = {
  role: 'assistant',
  content: "Hi! I'm your kitchen assistant. I know what's in your pantry and can help you cook, shop, and plan meals. What would you like to do?",
}

// Stable device ID — computed once at module load
const deviceId = getOrCreateDeviceId()

// syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
// realtimeStatus: 'SUBSCRIBING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | null
function SyncIndicator({ status, shared, realtimeStatus, online }) {
  const { t } = useTranslation()
  const colors = {
    idle: '#D1D5DB',
    syncing: '#3B82F6',
    synced: '#22c55e',
    error: '#EF4444',
  }

  const rtLabel = !online ? t('offline')
    : realtimeStatus === 'SUBSCRIBING' ? 'Connecting…'
    : realtimeStatus === 'SUBSCRIBED' ? t('live')
    : realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR' ? t('offline')
    : null

  const rtColor = !online ? '#F59E0B'
    : realtimeStatus === 'SUBSCRIBED' ? '#22c55e'
    : realtimeStatus === 'SUBSCRIBING' ? '#F59E0B'
    : '#9CA3AF'

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 14,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      pointerEvents: 'none',
    }}>
      {shared && rtLabel && (
        <span style={{ fontSize: 10, fontWeight: 600, color: rtColor, letterSpacing: 0.2 }}>
          {rtLabel}
        </span>
      )}
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

function OfflineBanner({ message }) {
  return (
    <div style={{
      background: '#FEF3C7',
      color: '#92400E',
      textAlign: 'center',
      fontSize: 13,
      fontWeight: 600,
      padding: '8px 16px',
      borderBottom: '1px solid #FDE68A',
      flexShrink: 0,
    }}>
      {message}
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const online = useNetworkStatus()
  const [activeTab, setActiveTab] = useState('pantry')
  const [pantry, setPantry] = useLocalStorage('pantry_v1', INITIAL_PANTRY)
  const [shoppingList, setShoppingList] = useLocalStorage('shopping_v1', INITIAL_SHOPPING_LIST)
  const [recipes, setRecipes] = useLocalStorage('recipes_v1', INITIAL_RECIPES)
  const [preferences, setPreferences] = useLocalStorage('prefs_v1', INITIAL_PREFERENCES)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [realtimeStatus, setRealtimeStatus] = useState(null)
  const [householdId, setHouseholdId] = useState(() => getOrCreateHouseholdId())
  const [myMember, setMyMember] = useState(null)
  const [conflictData, setConflictData] = useState(null)
  const [conflictChoices, setConflictChoices] = useState({})

  // ── Conversation state (lifted so it survives tab switches) ────
  const [messages, setMessages] = useState([INITIAL_GREETING])
  const [savedConvos, setSavedConvos] = useLocalStorage('saved_convos_v1', [])
  const [convoCounter, setConvoCounter] = useLocalStorage('convo_counter_v1', 0)

  // ── Toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const debounceRef = useRef(null)
  const pantryRef = useRef(pantry)
  const shoppingRef = useRef(shoppingList)
  const isRemoteUpdateRef = useRef(false)
  const channelRef = useRef(null)
  pantryRef.current = pantry
  shoppingRef.current = shoppingList

  const appState = { pantry, shoppingList, preferences }

  // Whether this device has joined a shared household
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
    async function init() {
      try {
        setSyncStatus('syncing')
        const remote = await pullFromSupabase(householdId)

        // Handle household ID redirect — re-run effect with resolved ID
        if (remote.resolvedId && remote.resolvedId !== householdId) {
          setHouseholdId(remote.resolvedId)
          return
        }

        const remotePantry = remote.pantry
        const remoteShopping = remote.shoppingList
        const hasRemotePantry = Array.isArray(remotePantry) && remotePantry.length > 0
        const hasRemoteShopping = Array.isArray(remoteShopping) && remoteShopping.length > 0

        if (hasRemotePantry || hasRemoteShopping) {
          if (hasRemotePantry) {
            const { merged, conflicts } = resolveConflicts(pantryRef.current, remotePantry)
            // Apply merged + local versions of conflicted items by default
            const initial = [...merged, ...conflicts.map(({ local }) => local)]
            isRemoteUpdateRef.current = true
            setPantry(initial)
            if (conflicts.length > 0) {
              const defaultChoices = {}
              conflicts.forEach(c => { defaultChoices[c.id] = 'mine' })
              setConflictChoices(defaultChoices)
              setConflictData({ merged, conflicts })
            }
          }
          if (hasRemoteShopping) {
            isRemoteUpdateRef.current = true
            setShoppingList(remoteShopping)
          }
        } else {
          // Remote is empty — seed it from local so the second device gets our data
          await pushToSupabase(householdId, pantryRef.current, shoppingRef.current)
        }

        // Register this device as a household member
        const member = await registerMember(householdId, deviceId)
        if (member) setMyMember(member)

        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 3000)
      } catch {
        setSyncStatus('idle')
      }
    }
    init()

    try {
      if (channelRef.current) supabase.removeChannel(channelRef.current)

      channelRef.current = supabase
        .channel(`household-${householdId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pantry' },
          (payload) => {
            if (payload.new?.id !== householdId) return
            const incoming = payload.new?.data
            if (incoming && Array.isArray(incoming)) {
              isRemoteUpdateRef.current = true
              setPantry(incoming)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'shopping_list' },
          (payload) => {
            if (payload.new?.id !== householdId) return
            const incoming = payload.new?.data
            if (incoming && Array.isArray(incoming)) {
              isRemoteUpdateRef.current = true
              setShoppingList(incoming)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'household_members' },
          (payload) => {
            // Detect when this device's member row is moved to a new household ID
            if (
              payload.new?.device_id === deviceId &&
              payload.new?.household_id &&
              payload.new.household_id !== householdId
            ) {
              localStorage.setItem('household_id_v1', payload.new.household_id)
              window.location.reload()
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime] status:', status, err ?? '')
          setRealtimeStatus(status)
        })
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
        await pushToSupabase(householdId, pantryRef.current, shoppingRef.current)
        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 3000)
      } catch {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    }, 2000)
  }, [pantry, shoppingList])

  // ── Manual sync ────────────────────────────────────────────────
  const handleSyncNow = async () => {
    try {
      setSyncStatus('syncing')
      const remote = await pullFromSupabase(householdId)
      if (Array.isArray(remote.pantry) && remote.pantry.length > 0) {
        isRemoteUpdateRef.current = true
        setPantry(remote.pantry)
      }
      if (Array.isArray(remote.shoppingList) && remote.shoppingList.length > 0) {
        isRemoteUpdateRef.current = true
        setShoppingList(remote.shoppingList)
      }
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus('idle'), 3000)
      return true
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
      return false
    }
  }

  // ── Join household ─────────────────────────────────────────────
  const handleJoinHousehold = async (newId) => {
    localStorage.setItem('household_id_v1', newId)
    localStorage.setItem('household_joined', 'true')
    setHouseholdId(newId)
  }

  // ── Leave household ────────────────────────────────────────────
  const handleLeaveHousehold = async () => {
    if (!myMember) return
    clearTimeout(debounceRef.current)
    await leaveHousehold(myMember, householdId)
    const newId = crypto.randomUUID()
    localStorage.setItem('household_id_v1', newId)
    localStorage.removeItem('household_joined')
    setMyMember(null)
    setHouseholdId(newId)
  }

  // ── Change household ID ────────────────────────────────────────
  const handleChangeHouseholdId = async (newId) => {
    clearTimeout(debounceRef.current)
    await changeHouseholdIdInDb(householdId, newId, pantry, shoppingList)
    setHouseholdId(newId)
  }

  // ── Delete all data ────────────────────────────────────────────
  const handleDeleteAllData = async () => {
    setPantry([])
    setShoppingList([])
    await pushToSupabase(householdId, [], [])
  }

  // ── Conflict resolution ────────────────────────────────────────
  const confirmConflictChoices = () => {
    if (!conflictData) return
    const resolved = [
      ...conflictData.merged,
      ...conflictData.conflicts.map(({ id, local, remote }) =>
        conflictChoices[id] === 'theirs' ? remote : local
      ),
    ]
    isRemoteUpdateRef.current = true
    setPantry(resolved)
    setConflictData(null)
    setConflictChoices({})
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
      <SyncIndicator status={syncStatus} shared={isSharedHousehold} realtimeStatus={realtimeStatus} online={online} />
      <Toast message={toast} />

      <style>{`
        @keyframes sync-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>

      {/* Offline banner */}
      {!online && <OfflineBanner message={t('offlineBanner')} />}

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
            messages={messages}
            setMessages={setMessages}
            savedConvos={savedConvos}
            setSavedConvos={setSavedConvos}
            convoCounter={convoCounter}
            setConvoCounter={setConvoCounter}
            onToast={showToast}
            initialGreeting={INITIAL_GREETING}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            preferences={preferences}
            onUpdate={updatePreferences}
            onResetData={resetData}
            householdId={householdId}
            onJoinHousehold={handleJoinHousehold}
            onSyncNow={handleSyncNow}
            myMember={myMember}
            online={online}
            onLeaveHousehold={handleLeaveHousehold}
            onChangeHouseholdId={handleChangeHouseholdId}
            onDeleteAllData={handleDeleteAllData}
          />
        )}
      </div>

      {/* Tab bar */}
      <nav className="tab-bar">
        {TAB_IDS.map(id => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <span className="tab-icon">{TAB_ICONS[id]}</span>
            <span>
              {t(id)}
              {id === 'shopping' && shoppingBadge > 0 && (
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

      {/* Conflict resolution modal */}
      {conflictData && (
        <AppModal
          isOpen
          title={t('conflictTitle')}
          onClose={confirmConflictChoices}
          actions={[
            {
              label: t('keepAllMine'),
              style: 'ghost',
              onClick: () => {
                const allMine = {}
                conflictData.conflicts.forEach(c => { allMine[c.id] = 'mine' })
                setConflictChoices(allMine)
              },
            },
            {
              label: t('useAllTheirs'),
              style: 'ghost',
              onClick: () => {
                const allTheirs = {}
                conflictData.conflicts.forEach(c => { allTheirs[c.id] = 'theirs' })
                setConflictChoices(allTheirs)
              },
            },
            {
              label: t('confirmChoices'),
              style: 'primary',
              onClick: confirmConflictChoices,
            },
          ]}
        >
          <div>
            <p style={{ marginBottom: 12 }}>{t('conflictBody')}</p>
            {conflictData.conflicts.map(({ id, local, remote }) => (
              <div key={id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text)', fontSize: 14 }}>
                  {local.name || remote.name}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setConflictChoices(prev => ({ ...prev, [id]: 'mine' }))}
                    style={{
                      flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600,
                      borderRadius: 6, cursor: 'pointer', border: '1.5px solid',
                      background: conflictChoices[id] !== 'theirs' ? 'var(--color-primary)' : 'transparent',
                      color: conflictChoices[id] !== 'theirs' ? 'white' : 'var(--color-text-muted)',
                      borderColor: conflictChoices[id] !== 'theirs' ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  >
                    {t('keepMine')}
                    {local.lastUpdatedAt && (
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                        {t('updatedAt')(new Date(local.lastUpdatedAt).toLocaleTimeString())}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setConflictChoices(prev => ({ ...prev, [id]: 'theirs' }))}
                    style={{
                      flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600,
                      borderRadius: 6, cursor: 'pointer', border: '1.5px solid',
                      background: conflictChoices[id] === 'theirs' ? 'var(--color-primary)' : 'transparent',
                      color: conflictChoices[id] === 'theirs' ? 'white' : 'var(--color-text-muted)',
                      borderColor: conflictChoices[id] === 'theirs' ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  >
                    {t('useTheirs')}
                    {remote.lastUpdatedAt && (
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                        {t('updatedAt')(new Date(remote.lastUpdatedAt).toLocaleTimeString())}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AppModal>
      )}
    </div>
  )
}
