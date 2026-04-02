import { useContext } from 'react'
import { LangContext } from '../LangContext.jsx'
import { translations } from '../i18n.js'

export function useTranslation() {
  const { lang } = useContext(LangContext)
  const dict = translations[lang] || translations.en
  const t = (key) => dict[key] ?? translations.en[key] ?? key
  const tUnit = (k) => dict.units?.[k] ?? translations.en.units?.[k] ?? k
  const tCat = (k) => dict.categories?.[k] ?? translations.en.categories?.[k] ?? k
  return { t, lang, tUnit, tCat }
}
