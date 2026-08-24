'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { DEFAULT_LOCALE, Locale, translations } from './translations'

const STORAGE_KEY = 'language'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function isLocale(value: unknown): value is Locale {
  return value === 'fr-CA' || value === 'en'
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return Object.entries(params).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  )
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Restore the session's language choice on mount. Deliberately does NOT read
  // navigator.language — FR-009 requires French Canadian by default regardless
  // of the browser's configured language.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (isLocale(stored)) {
        setLocaleState(stored)
      }
    } catch {
      // sessionStorage unavailable (e.g. private mode edge cases) — keep default
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Non-fatal: the choice just won't survive client-side navigation reloads
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale]
      // Fall back to the fr-CA value (never the raw key or an empty string) when
      // a key is missing from the active locale's dictionary — see data-model.md
      // § Dictionnaire and the spec's "traduction manquante" edge case.
      const raw = dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key
      return interpolate(raw, params)
    },
    [locale]
  )

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
