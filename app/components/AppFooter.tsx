'use client'

import { useLanguage } from '@/app/lib/i18n/LanguageContext'

export default function AppFooter() {
  const { t } = useLanguage()

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">{t('common.footer')}</p>
      </div>
    </footer>
  )
}
