import { geocodeMultiple } from '@/app/lib/nominatim'

function mockNominatimResponse(
  results: {
    lat: string
    lon: string
    display_name: string
    importance?: number
    address?: { postcode?: string }
  }[]
) {
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

  it('marks an address as ambiguous when results span distinct localities of comparable importance', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        {
          lat: '45.75',
          lon: '4.85',
          display_name: 'Boulevard Paris, Lyon, Rhône, Auvergne-Rhône-Alpes, France',
          importance: 0.55,
        },
        {
          lat: '48.85',
          lon: '2.35',
          display_name: 'Boulevard Paris, Paris, Île-de-France, France',
          importance: 0.52,
        },
      ])
    )

    const response = await geocodeMultiple(['Boulevard Paris'])

    expect(response.results[0].status).toBe('ambiguous')
    expect(response.results[0].alternatives?.length).toBe(1)
    expect(response.validCount).toBe(1)
    expect(response.invalidCount).toBe(0)
  })

  it('marks an address as valid when a much lower-importance same-name street exists elsewhere (regression: postal-code-qualified address)', async () => {
    // Reproduces the real-world false positive: "44 Rue des Jardins, Québec,
    // QC G1R 3Z1" (a specific, postal-code-qualified address) was flagged
    // ambiguous just because Nominatim's top-3 also included an unrelated,
    // far less relevant "Rue des Jardins" in a different town.
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        {
          lat: '46.81',
          lon: '-71.20',
          display_name: '44, Rue des Jardins, Vieux-Québec, Québec, G1R 3Z1',
          importance: 0.0000722,
        },
        {
          lat: '46.65',
          lon: '-71.29',
          display_name: '44, Rue des Jardins, Saint-Étienne-de-Lauzon, Lévis, Québec, G6J 1J3',
          importance: 0.00001,
        },
      ])
    )

    const response = await geocodeMultiple(['44 Rue des Jardins, Quebec, QC G1R 3Z1'])

    expect(response.results[0].status).toBe('valid')
  })

  it('marks an address as valid when a same-name street exists in a different postal district, even with comparable importance (regression: FSA mismatch)', async () => {
    // Reproduces a second real-world false positive: "49 Rue Saint-Louis,
    // Québec, QC G1R 3Z2" was flagged ambiguous against same-named streets in
    // Lévis and Granby whose Nominatim importance scores were close enough to
    // slip past the importance-ratio check alone — the postal code the user
    // typed (G1R) is in a completely different district than the alternates'
    // own postcodes (G6V, J2G), which should rule them out.
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockNominatimResponse([
        {
          lat: '46.81',
          lon: '-71.21',
          display_name: '49, Rue Saint-Louis, Vieux-Québec, Québec, G1R 4E7',
          importance: 0.0000722,
          address: { postcode: 'G1R 4E7' },
        },
        {
          lat: '46.75',
          lon: '-71.17',
          display_name: '49, Rue Saint-Louis, Lévis (quartier), Lévis, Québec, G6V 4G1',
          importance: 0.0000594,
          address: { postcode: 'G6V 4G1' },
        },
        {
          lat: '45.4',
          lon: '-72.73',
          display_name: '49, Rue Saint-Louis, Granby, Québec, J2G 7A2',
          importance: 0.0000579,
          address: { postcode: 'J2G 7A2' },
        },
      ])
    )

    const response = await geocodeMultiple(['49 Rue Saint-Louis, Quebec, QC G1R 3Z2'])

    expect(response.results[0].status).toBe('valid')
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
