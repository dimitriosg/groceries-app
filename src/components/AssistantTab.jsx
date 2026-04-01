import { useState, useRef, useEffect, useCallback } from 'react'
import { callAssistant } from '../utils/assistant.js'
import { applyActions } from '../utils/actions.js'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

const QUICK_CHIPS = [
  "What can I cook tonight?",
  "What's running low?",
  "Add eggs to my list",
  "Suggest a quick dinner for 2",
]

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

export default function AssistantTab({ appState, onStateChange }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your kitchen assistant. I know what's in your pantry and can help you cook, shop, and plan meals. What would you like to do?",
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const handleVoiceResult = useCallback((text) => {
    setInput(prev => prev ? `${prev} ${text}` : text)
  }, [])
  const { supported: voiceSupported, listening, permissionDenied: micDenied, start: startListening, stop: stopListening } = useSpeechRecognition(handleVoiceResult)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      // Build history for API (exclude first greeting and action metadata)
      const history = messages
        .filter(m => m.role !== 'assistant' || m !== messages[0])
        .map(m => ({ role: m.role, content: m.content }))

      const { displayText, actions } = await callAssistant(trimmed, appState, history)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Messages area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 16,
        paddingBottom: 'calc(var(--tab-height) + var(--safe-bottom) + 100px)',
      }}>
        <div style={{ padding: '0 4px 8px', textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            🔒 Your pantry data is sent to Claude AI
          </span>
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
            🎤 Microphone access denied
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
            placeholder="Ask me anything..."
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
