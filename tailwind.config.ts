import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'error': '#ef4444',
        'success': '#10b981',
        'warning': '#f59e0b',
      },
    },
  },
  plugins: [],
}
export default config
