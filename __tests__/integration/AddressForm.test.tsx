import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddressForm from '@/app/components/AddressForm'

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

describe('AddressForm', () => {
  beforeEach(() => {
    mockGeocodeFetch()
  })

  it('renders the start/return address in its own isolated section with no remove control', () => {
    render(<AddressForm onSubmit={jest.fn()} />)

    expect(screen.getByText(/Start \/ Return Address/i)).toBeInTheDocument()
    // Two default stop rows are rendered, but no "Remove stop" button until > 2 rows exist
    expect(screen.queryByTitle('Remove stop')).not.toBeInTheDocument()
  })

  it('caps stop addresses at 20 and disables "+ Add Stop" at the limit', () => {
    render(<AddressForm onSubmit={jest.fn()} />)
    const addButton = screen.getByRole('button', { name: '+ Add Stop' })

    for (let i = 0; i < 25; i++) {
      fireEvent.click(addButton)
    }

    const stopInputs = screen.getAllByPlaceholderText(/Stop \d+/)
    expect(stopInputs.length).toBe(20)
    expect(addButton).toBeDisabled()
    expect(screen.getByText(/Maximum 20 stop addresses reached/i)).toBeInTheDocument()
  })

  it('shows an inline error for an invalid stop address on blur, without blocking the others', async () => {
    render(<AddressForm onSubmit={jest.fn()} />)
    const stopInputs = screen.getAllByPlaceholderText(/Stop \d+/)

    fireEvent.change(stopInputs[0], { target: { value: 'invalid address' } })
    fireEvent.blur(stopInputs[0])

    await waitFor(() => {
      expect(screen.getByText(/Address not found: "invalid address"/i)).toBeInTheDocument()
    })

    fireEvent.change(stopInputs[1], { target: { value: '456 Oak Ave, Portland OR' } })
    fireEvent.blur(stopInputs[1])

    await waitFor(() => {
      expect(screen.getAllByText('✓ Valid').length).toBeGreaterThan(0)
    })
  })

  it('keeps the submit button disabled until the start address and 2 stops are valid', async () => {
    render(<AddressForm onSubmit={jest.fn()} />)
    const submitButton = screen.getByRole('button', { name: /Optimize Route/i })
    expect(submitButton).toBeDisabled()

    const startInput = screen.getByPlaceholderText(/start and return to/i)
    fireEvent.change(startInput, { target: { value: '1 Start St, Portland OR' } })
    fireEvent.blur(startInput)

    const stopInputs = screen.getAllByPlaceholderText(/Stop \d+/)
    fireEvent.change(stopInputs[0], { target: { value: '2 Stop St, Portland OR' } })
    fireEvent.blur(stopInputs[0])
    fireEvent.change(stopInputs[1], { target: { value: '3 Stop St, Portland OR' } })
    fireEvent.blur(stopInputs[1])

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})
