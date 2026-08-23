import { parseBulkAddressText } from '@/app/lib/utils'

describe('parseBulkAddressText', () => {
  it('splits multiline text into trimmed lines', () => {
    const input = '123 Main St, Portland OR\n456 Oak Ave, Portland OR'
    expect(parseBulkAddressText(input)).toEqual([
      '123 Main St, Portland OR',
      '456 Oak Ave, Portland OR',
    ])
  })

  it('drops empty and whitespace-only lines', () => {
    const input = '123 Main St\n\n   \n456 Oak Ave\n'
    expect(parseBulkAddressText(input)).toEqual(['123 Main St', '456 Oak Ave'])
  })

  it('trims leading and trailing whitespace on each line', () => {
    const input = '  123 Main St  \n  456 Oak Ave  '
    expect(parseBulkAddressText(input)).toEqual(['123 Main St', '456 Oak Ave'])
  })

  it('returns a single-element array for text with no newline', () => {
    expect(parseBulkAddressText('123 Main St, Portland OR')).toEqual(['123 Main St, Portland OR'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseBulkAddressText('   \n  \n')).toEqual([])
  })
})
