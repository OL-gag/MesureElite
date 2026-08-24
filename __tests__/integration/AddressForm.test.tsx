import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddressForm from '@/app/components/AddressForm'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { LanguageProvider } from '@/app/lib/i18n/LanguageContext'

function mockGeocodeFetch() {
  global.fetch = jest.fn(async (_url, init) => {
    const body = JSON.parse((init as RequestInit).body as string)
    const results = body.addresses.map((a: { text: string }) => {
      if (a.text.toLowerCase().includes('invalid')) {
        return { id: 'x', status: 'invalid', error: `Address not found: "${a.text}"` }
      }
      return { id: 'x', status: 'valid', lat: 45.5, lon: -122.6, displayName: a.text }
    })
    return {
      ok: true,
      status: 200,
      json: async () => ({
        results,
        validCount: results.filter((r: any) => r.status === 'valid').length,
        invalidCount: results.filter((r: any) => r.status !== 'valid').length,
      }),
    } as Response
  }) as jest.Mock
}

function renderForm() {
  return render(
    <LanguageProvider>
      <AddressForm onSubmit={jest.fn()} />
    </LanguageProvider>
  )
}

describe('AddressForm', () => {
  beforeEach(() => {
    mockGeocodeFetch()
  })

  it('renders the start/return address in its own isolated section with no remove control (fr-CA default)', () => {
    renderForm()

    expect(screen.getByText(/Adresse de départ \/ retour/i)).toBeInTheDocument()
    // Two default stop rows are rendered, but no remove button until > 2 rows exist
    expect(screen.queryByTitle(/Supprimer l'arrêt/i)).not.toBeInTheDocument()
  })

  it('caps stop addresses at 20 and disables the add-stop button at the limit', () => {
    renderForm()
    const addButton = screen.getByRole('button', { name: /Ajouter un arrêt/i })

    for (let i = 0; i < 25; i++) {
      fireEvent.click(addButton)
    }

    const stopInputs = screen.getAllByPlaceholderText(/Arrêt \d+/)
    expect(stopInputs.length).toBe(20)
    expect(addButton).toBeDisabled()
    expect(screen.getByText(/Maximum 20 adresses d'arrêt atteint/i)).toBeInTheDocument()
  })

  it('shows an inline error for an invalid stop address on blur, without blocking the others', async () => {
    renderForm()
    const stopInputs = screen.getAllByPlaceholderText(/Arrêt \d+/)

    fireEvent.change(stopInputs[0], { target: { value: 'invalid address' } })
    fireEvent.blur(stopInputs[0])

    await waitFor(() => {
      expect(screen.getByText(/Address not found: "invalid address"/i)).toBeInTheDocument()
    })

    fireEvent.change(stopInputs[1], { target: { value: '456 Oak Ave, Portland OR' } })
    fireEvent.blur(stopInputs[1])

    await waitFor(() => {
      expect(screen.getAllByText('✓ Valide').length).toBeGreaterThan(0)
    })
  })

  it('keeps the submit button disabled until the start address and 2 stops are valid', async () => {
    renderForm()
    const submitButton = screen.getByRole('button', { name: /Optimiser l'itinéraire/i })
    expect(submitButton).toBeDisabled()

    const startInput = screen.getByPlaceholderText(/départ et de retour/i)
    fireEvent.change(startInput, { target: { value: '1 Start St, Portland OR' } })
    fireEvent.blur(startInput)

    const stopInputs = screen.getAllByPlaceholderText(/Arrêt \d+/)
    fireEvent.change(stopInputs[0], { target: { value: '2 Stop St, Portland OR' } })
    fireEvent.blur(stopInputs[0])
    fireEvent.change(stopInputs[1], { target: { value: '3 Stop St, Portland OR' } })
    fireEvent.blur(stopInputs[1])

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('does not lose entered address values when switching language (US2, FR-004)', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
        <AddressForm onSubmit={jest.fn()} />
      </LanguageProvider>
    )

    const startInput = screen.getByPlaceholderText(/départ et de retour/i)
    fireEvent.change(startInput, { target: { value: '1 Start St, Portland OR' } })

    const stopInputs = screen.getAllByPlaceholderText(/Arrêt \d+/)
    fireEvent.change(stopInputs[0], { target: { value: '2 Stop St, Portland OR' } })
    fireEvent.change(stopInputs[1], { target: { value: '3 Stop St, Portland OR' } })

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByText(/Start \/ Return Address/i)).toBeInTheDocument()
    const startInputAfter = screen.getByPlaceholderText(/start and return to/i)
    const stopInputsAfter = screen.getAllByPlaceholderText(/Stop \d+/)

    expect((startInputAfter as HTMLInputElement).value).toBe('1 Start St, Portland OR')
    expect((stopInputsAfter[0] as HTMLInputElement).value).toBe('2 Stop St, Portland OR')
    expect((stopInputsAfter[1] as HTMLInputElement).value).toBe('3 Stop St, Portland OR')
  })
})
