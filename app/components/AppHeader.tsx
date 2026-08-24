'use client'

import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function AppHeader() {
  const { t } = useLanguage()

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">🗺️</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('common.appName')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">{t('common.tagline')}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </header>
  )
}
