import { geocodeMultiple } from '@/app/lib/nominatim'

function mockNominatimResponse(results: { lat: string; lon: string; display_name: string }[]) {
  return {
    ok: true,
    status: 200,
    json: async () => results,
  } as Response
}

describe('geocodeMultiple — ambiguous classification', () => {
  beforeEach(() => {
    window.localStorage.clear()
    global.fetch = jest.fn()
  })

  it('marks an address as ambiguous when results span distinct localities', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        { lat: '45.75', lon: '4.85', display_name: 'Boulevard Paris, Lyon, Rhône, Auvergne-Rhône-Alpes, France' },
        { lat: '48.85', lon: '2.35', display_name: 'Boulevard Paris, Paris, Île-de-France, France' },
      ])
    )

    const response = await geocodeMultiple(['Boulevard Paris'])

    expect(response.results[0].status).toBe('ambiguous')
    expect(response.results[0].alternatives?.length).toBe(1)
    expect(response.validCount).toBe(1)
    expect(response.invalidCount).toBe(0)
  })

  it('marks an address as valid when there is a single clear match', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        { lat: '45.5', lon: '-122.6', display_name: '123 Main St, Portland, Multnomah County, Oregon, USA' },
      ])
    )

    const response = await geocodeMultiple(['123 Main St, Portland OR'])

    expect(response.results[0].status).toBe('valid')
    expect(response.validCount).toBe(1)
  })

  it('marks an address as valid (not ambiguous) when extra results are the same locality', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        { lat: '45.5', lon: '-122.6', display_name: '123 Main St, Portland, Multnomah County, Oregon, USA' },
        { lat: '45.5', lon: '-122.61', display_name: '125 Main St, Portland, Multnomah County, Oregon, USA' },
      ])
    )

    const response = await geocodeMultiple(['Main St, Portland OR'])

    expect(response.results[0].status).toBe('valid')
  })

  it('marks an address as invalid when no results are found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockNominatimResponse([]))

    const response = await geocodeMultiple(['XYZ Nonexistent Street'])

    expect(response.results[0].status).toBe('invalid')
    expect(response.invalidCount).toBe(1)
  })
})
