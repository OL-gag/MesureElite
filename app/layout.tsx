import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from './lib/i18n/LanguageContext'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'

export const metadata: Metadata = {
  title: 'MesureMG - Optimisation de trajet',
  description: 'Calculez le trajet le plus court entre plusieurs adresses',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr-CA">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 min-h-screen">
        <LanguageProvider>
          <AppHeader />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <AppFooter />
        </LanguageProvider>
      </body>
    </html>
  )
}
