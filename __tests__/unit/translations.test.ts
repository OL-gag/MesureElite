import { translations, DEFAULT_LOCALE, hasTranslationKey } from '@/app/lib/i18n/translations'

describe('translations dictionary completeness', () => {
  const frKeys = Object.keys(translations['fr-CA']).sort()
  const enKeys = Object.keys(translations['en']).sort()

  it('has the same keys in fr-CA and en', () => {
    expect(enKeys).toEqual(frKeys)
  })

  it('has no empty values in either dictionary', () => {
    for (const [locale, dict] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(dict)) {
        if (value.trim().length === 0) {
          throw new Error(`${locale}.${key} should not be empty`)
        }
      }
    }
  })

  it('defaults to fr-CA', () => {
    expect(DEFAULT_LOCALE).toBe('fr-CA')
  })

  it('hasTranslationKey reflects real keys', () => {
    expect(hasTranslationKey('common.appName')).toBe(true)
    expect(hasTranslationKey('errors.ADDRESS_NOT_FOUND')).toBe(true)
    expect(hasTranslationKey('errors.SOME_UNKNOWN_CODE')).toBe(false)
  })
})
