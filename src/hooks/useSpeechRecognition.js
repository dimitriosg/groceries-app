import { useState, useRef, useCallback } from 'react'

export function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const recognitionRef = useRef(null)

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setPermissionDenied(false)
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onresult = (e) => onResult(e.results[0][0].transcript)
    r.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed') setPermissionDenied(true)
    }
    recognitionRef.current = r
    r.start()
  }, [onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, permissionDenied, start, stop }
}
