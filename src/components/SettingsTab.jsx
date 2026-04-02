import { useState, useEffect, useContext } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { LangContext } from '../LangContext.jsx'
import { fetchMembers, promoteToAdmin } from '../utils/sync.js'
import AppModal from './AppModal.jsx'

const CUISINES = [
  'Greek', 'Italian', 'Mediterranean', 'Asian', 'Japanese', 'Chinese', 'Thai',
  'Indian', 'Middle Eastern', 'Mexican', 'Brazilian', 'LATAM', 'American', 'French', 'Spanish',
  'Turkish', 'Lebanese', 'Moroccan', 'Vietnamese', 'Korean', 'British', 'Eastern European',
]

const SKILL_LEVELS = [
  { value: 1, label: 'skillLabel1', color: '#22c55e' },
  { value: 2, label: 'skillLabel2', color: '#84cc16' },
  { value: 3, label: 'skillLabel3', color: '#EAB308' },
  { value: 4, label: 'skillLabel4', color: '#F97316' },
  { value: 5, label: 'skillLabel5', color: '#EF4444' },
]

const SKILL_LEVEL_MAP = { 1: 'beginner', 2: 'beginner', 3: 'intermediate', 4: 'advanced', 5: 'advanced' }

export default function SettingsTab({
  preferences, onUpdate, onResetData,
  householdId, onJoinHousehold, onSyncNow,
  myMember, online, onLeaveHousehold, onChangeHouseholdId, onDeleteAllData,
}) {
  const { t } = useTranslation()
  const { setLang, lang } = useContext(LangContext)
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState('')
  const [modal, setModal] = useState(null)
  const [members, setMembers] = useState([])
  const [newHouseholdId, setNewHouseholdId] = useState('')
  const [changeIdError, setChangeIdError] = useState('')

  const isAdmin = myMember?.role?.startsWith('admin')

  useEffect(() => {
    if (!householdId) return
    fetchMembers(householdId).then(data => setMembers(data || []))
  }, [householdId])

  function update(key, value) {
    onUpdate({ ...preferences, [key]: value })
  }

  function handleSkillChange(value) {
    onUpdate({ ...preferences, skillLevelNumeric: value, skillLevel: SKILL_LEVEL_MAP[value] })
  }

  function toggleCuisine(cuisine) {
    const current = preferences.cuisines || []
    const next = current.includes(cuisine)
      ? current.filter(c => c !== cuisine)
      : [...current, cuisine]
    update('cuisines', next)
  }

  function isRecentlyActive(member) {
    if (!member.last_seen) return false
    return (Date.now() - new Date(member.last_seen).getTime()) < 5 * 60 * 1000
  }

  function handleMakeAdmin(member) {
    setModal({
      title: t('makeAdmin'),
      body: t('makeAdminConfirm')(member.display_name),
      actions: [
        {
          label: t('makeAdmin'), style: 'primary',
          onClick: async () => {
            await promoteToAdmin(member.id, householdId)
            const updated = await fetchMembers(householdId)
            setMembers(updated || [])
            setModal(null)
          },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleLeave() {
    setModal({
      title: t('leaveHousehold'),
      body: t('leaveHouseholdBody'),
      actions: [
        {
          label: t('leave'), style: 'danger',
          onClick: async () => { await onLeaveHousehold(); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function validateNewId(id) {
    if (!/^[a-zA-Z0-9-]{3,15}$/.test(id)) return t('idInvalid')
    return null
  }

  function handleChangeId() {
    // Strip only leading/trailing whitespace — no other transformation
    const value = newHouseholdId.trim()
    const err = validateNewId(value)
    if (err) { setChangeIdError(err); return }
    setChangeIdError('')
    setModal({
      title: t('changeHouseholdId'),
      body: t('changeHouseholdConfirm')(value),
      actions: [
        {
          label: t('change'), style: 'primary',
          onClick: async () => {
            setModal(null)
            try {
              console.log('[HouseholdID] saving:', value)
              await onChangeHouseholdId(value)
              setNewHouseholdId('')
            } catch (err) {
              setChangeIdError(err.message === 'ID_IN_USE' ? t('idInUse') : t('idInvalid'))
            }
          },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleDeleteAllData() {
    setModal({
      title: t('deleteAllData'),
      body: t('deleteAllDataBody'),
      actions: [
        {
          label: t('deleteEverything'), style: 'danger',
          onClick: async () => { await onDeleteAllData(); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleReset() {
    setModal({
      title: t('resetToSample'),
      body: t('resetConfirm'),
      actions: [
        { label: t('resetToSample'), style: 'danger', onClick: () => { onResetData(); setModal(null) } },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleCopyInviteCode() {
    navigator.clipboard.writeText(householdId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleJoin() {
    const trimmed = joinInput.trim()
    if (!trimmed) return
    setModal({
      title: t('joinHousehold'),
      body: t('joinConfirm'),
      actions: [
        {
          label: t('join'), style: 'primary',
          onClick: () => { onJoinHousehold(trimmed); setJoinInput(''); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  async function handleSyncNow() {
    setSyncFeedback('syncing')
    const ok = await onSyncNow()
    setSyncFeedback(ok ? 'done' : 'error')
    setTimeout(() => setSyncFeedback(''), 3000)
  }

  const currentSkill = preferences.skillLevelNumeric ?? 3
  const currentSkillLevel = SKILL_LEVELS.find(s => s.value === currentSkill) ?? SKILL_LEVELS[2]

  return (
    <div className="tab-content">
      <div className="page-header">
        <h1 className="page-title">{t('settingsTitle')}</h1>
      </div>

      {/* ── Household Sync ── */}
      <Section title={t('householdSync')}>
        <Row label={t('yourHouseholdId')}>
          <span style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, color: 'var(--color-text-muted)' }}>
            {householdId ? householdId.slice(0, 12) : '—'}
          </span>
        </Row>
        <Row label={t('inviteCode')}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, padding: '5px 12px' }}
            onClick={handleCopyInviteCode}
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </Row>
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {t('joiningHouseholdHint')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
              placeholder={t('joinPlaceholder')}
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
            />
            <button
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
              disabled={!joinInput.trim()}
              onClick={handleJoin}
            >
              {t('join')}
            </button>
          </div>
        </div>
        <div style={{ padding: '8px 0', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, padding: '5px 12px' }}
            disabled={syncFeedback === 'syncing' || !online}
            onClick={handleSyncNow}
          >
            {syncFeedback === 'syncing' ? t('syncing') : t('syncNow')}
          </button>
          {syncFeedback === 'done' && (
            <span style={{ fontSize: 13, color: 'var(--color-primary)' }}>{t('synced')}</span>
          )}
          {syncFeedback === 'error' && (
            <span style={{ fontSize: 13, color: 'var(--color-expiry)' }}>{t('syncFailed')}</span>
          )}
        </div>
      </Section>

      {/* ── Members ── */}
      {members.length > 0 && (
        <Section title={t('members')}>
          {members.map((member, idx) => (
            <Row
              key={member.id}
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                    background: isRecentlyActive(member) ? '#22c55e' : '#D1D5DB',
                  }} />
                  <span>{member.display_name}</span>
                  {member.id === myMember?.id && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(you)</span>
                  )}
                </div>
              }
              last={idx === members.length - 1 && members.length <= 1}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  {member.role}
                </span>
                {isAdmin && member.id !== myMember?.id && !member.role.startsWith('admin') && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => handleMakeAdmin(member)}
                  >
                    {t('makeAdmin')}
                  </button>
                )}
              </div>
            </Row>
          ))}
          {members.length > 1 && (
            <Row label={t('leaveHousehold')} last>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '5px 12px', color: 'var(--color-expiry)', borderColor: 'var(--color-expiry)' }}
                onClick={handleLeave}
              >
                {t('leave')}
              </button>
            </Row>
          )}
        </Section>
      )}

      {/* ── Change Household ID (admins only) ── */}
      {isAdmin && (
        <Section title={t('changeHouseholdId')}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {t('changeHouseholdHint')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                placeholder="new-household-id"
                maxLength={15}
                value={newHouseholdId}
                onChange={e => { setNewHouseholdId(e.target.value); setChangeIdError('') }}
              />
              <button
                className="btn btn-primary"
                style={{ flexShrink: 0 }}
                disabled={!newHouseholdId.trim()}
                onClick={handleChangeId}
              >
                {t('change')}
              </button>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {newHouseholdId.length}/15
            </div>
            {changeIdError && (
              <div style={{ fontSize: 12, color: 'var(--color-expiry)', marginTop: 2 }}>
                {changeIdError}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Household ── */}
      <Section title={t('household')}>
        <Row label={t('householdSize')}>
          <input
            className="form-input"
            type="number"
            min={1}
            max={10}
            style={{ width: 80, textAlign: 'center' }}
            value={preferences.householdSize ?? 2}
            onChange={e => update('householdSize', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
          />
        </Row>

        <Row label={t('cookingSkill')} last>
          <div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {SKILL_LEVELS.map(({ value, color }) => {
                const selected = currentSkill === value
                return (
                  <button
                    key={value}
                    onClick={() => handleSkillChange(value)}
                    style={{
                      width: 44, height: 44,
                      borderRadius: '50%',
                      border: `2.5px solid ${selected ? color : 'var(--color-border)'}`,
                      background: selected ? color : 'var(--color-surface)',
                      color: selected ? 'white' : 'var(--color-text-muted)',
                      fontSize: 15, fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: currentSkillLevel.color, marginTop: 4, fontWeight: 600 }}>
              {t(currentSkillLevel.label)}
            </div>
          </div>
        </Row>
      </Section>

      {/* ── Cuisine preferences ── */}
      <Section title={t('cuisinePreferences')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
          {CUISINES.map(cuisine => {
            const selected = (preferences.cuisines || []).includes(cuisine)
            return (
              <button
                key={cuisine}
                onClick={() => toggleCuisine(cuisine)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cuisine}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Defaults ── */}
      <Section title={t('defaults')}>
        <Row label={t('lowStockThreshold')}>
          <input
            className="form-input"
            type="number"
            min={1}
            style={{ width: 80, textAlign: 'center' }}
            value={preferences.lowStockThreshold ?? 2}
            onChange={e => update('lowStockThreshold', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </Row>

        <Row label={t('voiceInput')}>
          <Toggle
            checked={preferences.voiceEnabled ?? false}
            onChange={val => update('voiceEnabled', val)}
          />
        </Row>

        <Row label={t('pantryAlerts')}>
          <Toggle
            checked={preferences.notificationsEnabled ?? true}
            onChange={val => update('notificationsEnabled', val)}
          />
        </Row>

        <Row label={t('language')} last>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {[{ code: 'en', label: 'English' }, { code: 'el', label: 'Ελληνικά' }].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  flex: 1, padding: '7px 10px',
                  fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: lang === code ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: lang === code ? 'white' : 'var(--color-text)',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── Data ── */}
      <Section title={t('data')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 0' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', color: 'var(--color-expiry)', borderColor: 'var(--color-expiry)' }}
            onClick={handleReset}
          >
            {t('resetToSample')}
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', color: 'var(--color-expiry)', borderColor: 'var(--color-expiry)' }}
            onClick={handleDeleteAllData}
          >
            {t('deleteAllData')}
          </button>
        </div>
      </Section>

      <div style={{ height: 20 }} />

      <AppModal
        isOpen={!!modal}
        title={modal?.title}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      >
        {modal?.body}
      </AppModal>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="section-label">{title}</div>
      <div style={{
        margin: '0 20px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        padding: '4px 16px',
      }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '13px 0',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26,
        borderRadius: 13, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--color-primary)' : 'var(--color-border)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        width: 20, height: 20,
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}
