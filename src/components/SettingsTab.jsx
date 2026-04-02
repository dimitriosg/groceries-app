import { useState, useContext } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { LangContext } from '../LangContext.jsx'
import AppModal from './AppModal.jsx'

const CUISINES = [
  'Italian', 'Asian', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'French', 'Indian', 'American', 'Greek',
]

const SKILL_LEVEL_KEYS = ['beginner', 'intermediate', 'advanced']

export default function SettingsTab({ preferences, onUpdate, onResetData, householdId, onJoinHousehold, onSyncNow }) {
  const { t } = useTranslation()
  const { setLang, lang } = useContext(LangContext)
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState('')
  const [modal, setModal] = useState(null)

  function update(key, value) {
    onUpdate({ ...preferences, [key]: value })
  }

  function toggleCuisine(cuisine) {
    const current = preferences.cuisines || []
    const next = current.includes(cuisine)
      ? current.filter(c => c !== cuisine)
      : [...current, cuisine]
    update('cuisines', next)
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

  return (
    <div className="tab-content">
      <div className="page-header">
        <h1 className="page-title">{t('settingsTitle')}</h1>
      </div>

      {/* ── Household Sync ── */}
      <Section title={t('householdSync')}>
        <Row label={t('yourHouseholdId')}>
          <span style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, color: 'var(--color-text-muted)' }}>
            {householdId ? householdId.slice(0, 8) : '—'}
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
            disabled={syncFeedback === 'syncing'}
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
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {SKILL_LEVEL_KEYS.map(value => (
              <button
                key={value}
                onClick={() => update('skillLevel', value)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: preferences.skillLevel === value ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: preferences.skillLevel === value ? 'white' : 'var(--color-text)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t(value)}
              </button>
            ))}
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
                  fontSize: 13,
                  fontWeight: 500,
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
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
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
        <button
          className="btn btn-ghost"
          style={{ width: '100%', color: 'var(--color-expiry)', borderColor: 'var(--color-expiry)' }}
          onClick={handleReset}
        >
          {t('resetToSample')}
        </button>
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
      <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
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
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        cursor: 'pointer',
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
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}
