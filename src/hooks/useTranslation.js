import { useContext } from 'react'
import { LangContext } from '../LangContext.jsx'
import { translations } from '../i18n.js'

export function useTranslation() {
  const { lang } = useContext(LangContext)
  const dict = translations[lang] || translations.en
  const t = (key) => dict[key] ?? translations.en[key] ?? key
  const tUnit = (unitKey) => dict.units?.[unitKey] ?? unitKey
  const tCat = (catKey) => dict.categories?.[catKey] ?? catKey
  return { t, lang, tUnit, tCat }
}
