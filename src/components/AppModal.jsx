export default function AppModal({ isOpen, title, children, actions, onClose }) {
  if (!isOpen) return null

  const styleFor = (style) => {
    const base = {
      flex: 1,
      padding: '10px 16px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      border: 'none',
      transition: 'opacity 0.15s',
    }
    if (style === 'primary') return { ...base, background: 'var(--color-primary)', color: 'white' }
    if (style === 'danger') return { ...base, background: 'var(--color-expiry)', color: 'white' }
    return { ...base, background: 'transparent', color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border)' }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-card)',
        padding: '24px 20px 20px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'modal-scale-in 0.15s ease-out',
      }}>
        {title && (
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18, fontWeight: 700,
            marginBottom: 10, color: 'var(--color-text)',
          }}>
            {title}
          </h2>
        )}
        {children && (
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
            {children}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions?.map(a => (
            <button key={a.label} style={styleFor(a.style)} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes modal-scale-in {
          from { opacity: 0; transform: scale(0.94) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
