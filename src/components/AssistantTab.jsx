import { useState, useRef, useEffect, useCallback } from 'react'
import { callAssistant } from '../utils/assistant.js'
import { applyActions } from '../utils/actions.js'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AppModal from './AppModal.jsx'

const QUICK_CHIPS = [
  "What can I cook tonight?",
  "What's running low?",
  "Add eggs to my list",
  "Suggest a quick dinner for 2",
]

function getInitialGreeting(lang) {
  return {
    role: 'assistant',
    content: lang === 'el'
      ? 'Γεια! Είμαι ο βοηθός σου στην κουζίνα. Ξέρω τι έχεις στην αποθήκη σου και μπορώ να σε βοηθήσω με μαγείρεμα, αγορές και γεύματα. Τι θα ήθελες να κάνεις;'
      : "Hi! I'm your kitchen assistant. I know what's in your pantry and can help you cook, shop, and plan meals. What would you like to do?",
  }
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      padding: '0 16px',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>
          🥬
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
        color: isUser ? 'white' : 'var(--color-text)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {msg.content}
        {msg.actions && msg.actions.length > 0 && (
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            fontSize: 12, color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--color-primary)',
            fontWeight: 500,
          }}>
            ✓ {msg.actions.length} action{msg.actions.length > 1 ? 's' : ''} applied
          </div>
        )}
      </div>
    </div>
  )
}

function PillButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 13px',
        borderRadius: 'var(--radius-pill)',
        background: 'transparent',
        border: '1.5px solid var(--color-border)',
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        fontFamily: 'var(--font-body)',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export default function AssistantTab({
  appState, onStateChange,
  messages, setMessages,
  savedConvos, setSavedConvos,
  convoCounter, setConvoCounter,
  onToast, initialGreeting,
}) {
  const { t, lang } = useTranslation()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySelected, setHistorySelected] = useState([])
  const [modal, setModal] = useState(null)
  const [limitMsg, setLimitMsg] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const handleVoiceResult = useCallback((text) => {
    setInput(prev => prev ? `${prev} ${text}` : text)
  }, [])
  const { supported: voiceSupported, listening, permissionDenied: micDenied, start: startListening, stop: stopListening } = useSpeechRecognition(handleVoiceResult)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setMessages([getInitialGreeting(lang)])
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.role !== 'assistant' || m !== messages[0])
        .map(m => ({ role: m.role, content: m.content }))

      const { displayText, actions } = await callAssistant(trimmed, appState, history, lang)

      const assistantMsg = { role: 'assistant', content: displayText, actions }
      setMessages(prev => [...prev, assistantMsg])

      if (actions.length > 0) {
        const nextState = applyActions(appState, actions)
        onStateChange(nextState)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send(input)
  }

  // ── Save conversation ─────────────────────────────────────────
  function doSave() {
    if (messages.length <= 1) return false
    if (savedConvos.length >= 20) {
      setLimitMsg(true)
      setTimeout(() => setLimitMsg(false), 3000)
      return false
    }
    const newCount = convoCounter + 1
    setConvoCounter(newCount)
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toTimeString().slice(0, 5)
    const name = `#${newCount}_${dateStr}_${timeStr}`
    const newConvo = { id: newCount, name, messages, savedAt: now.toISOString() }
    setSavedConvos(prev => [...prev, newConvo])
    setMessages([getInitialGreeting(lang)])
    onToast(t('convoSaved'))
    return true
  }

  function handleSave() {
    doSave()
  }

  function handleNew() {
    if (messages.length <= 1) return
    setModal({
      title: t('newConvoTitle'),
      body: t('confirmDiscardOrSave'),
      actions: [
        {
          label: t('saveAndNew'), style: 'primary',
          onClick: () => {
            setModal(null)
            if (savedConvos.length >= 20) {
              setLimitMsg(true)
              setTimeout(() => setLimitMsg(false), 3000)
              return
            }
            doSave()
          },
        },
        {
          label: t('discardAndNew'), style: 'danger',
          onClick: () => { setMessages([getInitialGreeting(lang)]); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  // ── History actions ───────────────────────────────────────────
  function handleLoadConvo(convo) {
    const tryLoad = () => {
      setMessages(convo.messages)
      setHistoryOpen(false)
    }
    if (messages.length > 1) {
      setModal({
        title: t('history'),
        body: t('confirmLoadConvo'),
        actions: [
          { label: t('loadConvo'), style: 'primary', onClick: () => { tryLoad(); setModal(null) } },
          { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
        ],
      })
    } else {
      tryLoad()
    }
  }

  function handleDeleteSelectedConvos() {
    setModal({
      title: t('deleteSelected'),
      body: t('confirmDeleteConvos')(historySelected.length),
      actions: [
        {
          label: t('delete'), style: 'danger',
          onClick: () => {
            setSavedConvos(prev => prev.filter(c => !historySelected.includes(c.id)))
            setHistorySelected([])
            setModal(null)
          },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleDeleteAllConvos() {
    setModal({
      title: t('deleteAll'),
      body: t('confirmDeleteAll'),
      actions: [
        {
          label: t('deleteAll'), style: 'danger',
          onClick: () => { setSavedConvos([]); setHistorySelected([]); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function toggleHistorySelect(id) {
    setHistorySelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const isNewDisabled = messages.length <= 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>

      {/* History overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)',
          opacity: historyOpen ? 1 : 0,
          pointerEvents: historyOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
        onClick={() => setHistoryOpen(false)}
      />

      {/* History sidebar */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        height: '100%',
        width: '80%',
        maxWidth: 360,
        zIndex: 1000,
        background: 'var(--color-surface)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        transform: historyOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
            {t('history')}
          </span>
          <button onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', padding: 4 }}>✕</button>
        </div>

        {/* Action buttons */}
        {savedConvos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <button
              onClick={handleDeleteSelectedConvos}
              disabled={historySelected.length === 0}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 'var(--radius-pill)',
                background: 'transparent', border: '1.5px solid var(--color-border)',
                fontSize: 12, fontWeight: 500, cursor: historySelected.length === 0 ? 'not-allowed' : 'pointer',
                color: 'var(--color-expiry)',
                opacity: historySelected.length === 0 ? 0.4 : 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              {t('deleteSelected')}
            </button>
            <button
              onClick={handleDeleteAllConvos}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 'var(--radius-pill)',
                background: 'transparent', border: '1.5px solid var(--color-border)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                color: 'var(--color-expiry)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {t('deleteAll')}
            </button>
          </div>
        )}

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {savedConvos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)', fontSize: 14 }}>
              {t('noConvosSaved')}
            </div>
          ) : (
            savedConvos.slice().reverse().map(convo => (
              <div key={convo.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); toggleHistorySelect(convo.id) }}
                  style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${historySelected.includes(convo.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: historySelected.includes(convo.id) ? 'var(--color-primary)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {historySelected.includes(convo.id) && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleLoadConvo(convo)}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {convo.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(convo.savedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 16,
        paddingBottom: 'calc(var(--tab-height) + var(--safe-bottom) + 100px)',
      }}>
        {/* Privacy notice + action buttons */}
        <div style={{ padding: '0 4px 10px', textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
            {t('assistantPrivacy')}
          </span>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            <PillButton onClick={() => { setHistorySelected([]); setHistoryOpen(true) }}>
              {t('history')}
            </PillButton>
            <PillButton onClick={handleSave} disabled={messages.length <= 1}>
              {t('save')}
            </PillButton>
            <PillButton onClick={handleNew} disabled={isNewDisabled}>
              {t('newConvo')}
            </PillButton>
          </div>
          {limitMsg && (
            <div style={{ fontSize: 12, color: 'var(--color-expiry)', marginTop: 8, padding: '0 16px' }}>
              {t('maxConvosReached')}
            </div>
          )}
        </div>

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              🥬
            </div>
            <div style={{
              padding: '10px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px 16px 16px 16px',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--color-text-muted)',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            margin: '0 16px 12px',
            padding: '10px 14px',
            background: 'var(--color-expiry-bg)',
            border: '1px solid var(--color-expiry)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--color-expiry)',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {messages.length <= 1 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(var(--tab-height) + var(--safe-bottom) + 80px)',
          left: 0, right: 0,
          padding: '0 16px 8px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => send(chip)}
              style={{
                flexShrink: 0,
                padding: '7px 12px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                fontSize: 13,
                color: 'var(--color-text)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(var(--tab-height) + var(--safe-bottom))',
        left: 0, right: 0,
        padding: '10px 12px',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: `calc(10px + var(--safe-bottom))`,
      }}>
        {!apiKey && (
          <div style={{ fontSize: 12, color: 'var(--color-expiry)', marginBottom: 8, textAlign: 'center' }}>
            ⚠️ Add VITE_ANTHROPIC_API_KEY to your .env file to enable AI
          </div>
        )}
        {micDenied && (
          <div style={{ fontSize: 12, color: 'var(--color-expiry)', marginBottom: 8, textAlign: 'center' }}>
            🎤 {t('micDenied')}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {voiceSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              style={{
                width: 40, height: 40,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                background: listening ? '#EF4444' : 'var(--color-surface-2)',
                animation: listening ? 'mic-pulse 1s ease-in-out infinite' : 'none',
                transition: 'background 0.15s',
              }}
            >
              🎤
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder={t('askAnything')}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 20,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              resize: 'none',
              outline: 'none',
              background: 'var(--color-surface)',
              lineHeight: 1.4,
              maxHeight: 120,
              overflow: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: input.trim() && !loading ? 'var(--color-primary)' : 'var(--color-border)',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <span style={{ color: 'white', marginLeft: 2 }}>↑</span>
            )}
          </button>
        </form>
      </div>

      {/* AppModal */}
      <AppModal
        isOpen={!!modal}
        title={modal?.title}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      >
        {modal?.body}
      </AppModal>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
