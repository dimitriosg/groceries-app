export default function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 3000,
      background: 'var(--color-text)',
      color: 'var(--color-bg)',
      padding: '9px 18px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 13,
      fontWeight: 500,
      fontFamily: 'var(--font-body)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      whiteSpace: 'nowrap',
      animation: 'toast-in 0.2s ease-out',
      pointerEvents: 'none',
    }}>
      {message}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
