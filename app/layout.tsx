import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MesureMG - Route Optimizer',
  description: 'Calculate the shortest route between multiple addresses',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 min-h-screen">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">🗺️</span>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MesureMG</h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Route Optimization MVP</p>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              © 2026 MesureMG. Built with Next.js, Leaflet, and OpenStreetMap.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
