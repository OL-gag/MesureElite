'use client'

import { useLanguage } from '@/app/lib/i18n/LanguageContext'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('common.languageSwitcher.label')}>
      <button
        type="button"
        onClick={() => setLocale('fr-CA')}
        aria-pressed={locale === 'fr-CA'}
        className={`px-2 py-1 text-sm rounded-md transition-colors ${
          locale === 'fr-CA'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        {t('common.languageSwitcher.french')}
      </button>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        className={`px-2 py-1 text-sm rounded-md transition-colors ${
          locale === 'en'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        {t('common.languageSwitcher.english')}
      </button>
    </div>
  )
}
