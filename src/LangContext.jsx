import { createContext } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'

export const LangContext = createContext({ lang: 'en', setLang: () => {} })

export function LangProvider({ children }) {
  const [lang, setLang] = useLocalStorage('app_lang_v1', 'en')
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}
