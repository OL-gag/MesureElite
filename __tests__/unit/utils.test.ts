import { parseBulkAddressText, haversineDistanceKm, findDistanceOutliers } from '@/app/lib/utils'

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

describe('haversineDistanceKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineDistanceKm(46.81, -71.21, 46.81, -71.21)).toBeCloseTo(0, 3)
  })

  it('returns a plausible distance between two real Quebec addresses', () => {
    // Lac-Saint-Charles to Vieux-Québec, roughly 15-20km apart
    const km = haversineDistanceKm(46.8891431, -71.3728017, 46.8118452, -71.2074857)
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(25)
  })
})

describe('findDistanceOutliers', () => {
  it('returns nothing when fewer than 2 points are given', () => {
    expect(findDistanceOutliers([{ lat: 46.8, lon: -71.2 }])).toEqual([])
  })

  it('returns nothing when all points are within a reasonable cluster', () => {
    const points = [
      { lat: 46.8891431, lon: -71.3728017, label: 'Lac-Saint-Charles' },
      { lat: 46.8118452, lon: -71.2074857, label: 'Vieux-Québec' },
      { lat: 46.6596736, lon: -71.3221718, label: 'Lévis' },
    ]
    expect(findDistanceOutliers(points)).toEqual([])
  })

  it('flags an address geocoded to the wrong country (regression: "3379 chemin Crain" -> France)', () => {
    const points = [
      { lat: 46.8891431, lon: -71.3728017, label: 'Start, Québec' },
      { lat: 46.8118452, lon: -71.2074857, label: 'Stop, Québec' },
      { lat: 47.5288375, lon: 3.5834356, label: '3379 chemin Crain' }, // Auxerre, France
    ]
    const outliers = findDistanceOutliers(points)
    expect(outliers.map((o) => o.label)).toEqual(['3379 chemin Crain'])
    expect(outliers[0].nearestKm).toBeGreaterThan(300)
  })
})
