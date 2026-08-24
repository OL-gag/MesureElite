import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '@/app/lib/i18n/LanguageContext'

function Probe() {
  const { locale, setLocale, t } = useLanguage()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t('common.appName')}</span>
      <button onClick={() => setLocale('en')}>go-en</button>
      <button onClick={() => setLocale('fr-CA')}>go-fr</button>
    </div>
  )
}

describe('LanguageContext', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('defaults to fr-CA, ignoring navigator.language', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true })

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )

    expect(screen.getByTestId('locale').textContent).toBe('fr-CA')
  })

  it('setLocale updates state and persists to sessionStorage', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByText('go-en'))

    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(window.sessionStorage.getItem('language')).toBe('en')
  })

  it('restores a previously saved locale from sessionStorage on mount', () => {
    window.sessionStorage.setItem('language', 'en')

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )

    expect(screen.getByTestId('locale').textContent).toBe('en')
  })

  it('t() falls back to the fr-CA value for an unknown key rather than an empty string', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByText('go-en'))
    expect(screen.getByTestId('translated').textContent).toBe('MesureMG')
  })
})
