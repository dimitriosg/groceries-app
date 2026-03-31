const CUISINES = [
  'Italian', 'Asian', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'French', 'Indian', 'American', 'Greek',
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default function SettingsTab({ preferences, onUpdate, onResetData }) {
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
    if (window.confirm('Reset pantry and shopping list to sample data? This cannot be undone.')) {
      onResetData()
    }
  }

  return (
    <div className="tab-content">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* ── Household ── */}
      <Section title="Household">
        <Row label="Household size">
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

        <Row label="Cooking skill" last>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {SKILL_LEVELS.map(({ value, label }) => (
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
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── Cuisine preferences ── */}
      <Section title="Cuisine preferences">
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
      <Section title="Defaults">
        <Row label="Low stock threshold">
          <input
            className="form-input"
            type="number"
            min={1}
            style={{ width: 80, textAlign: 'center' }}
            value={preferences.lowStockThreshold ?? 2}
            onChange={e => update('lowStockThreshold', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </Row>

        <Row label="Voice input" last>
          <Toggle
            checked={preferences.voiceEnabled ?? false}
            onChange={val => update('voiceEnabled', val)}
          />
        </Row>
      </Section>

      {/* ── Data ── */}
      <Section title="Data">
        <button
          className="btn btn-ghost"
          style={{ width: '100%', color: 'var(--color-expiry)', borderColor: 'var(--color-expiry)' }}
          onClick={handleReset}
        >
          Reset to sample data
        </button>
      </Section>

      <div style={{ height: 20 }} />
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
