// POST /api/geocode
// Geocode multiple addresses using Nominatim (per contracts/api-geocode.md)

import { NextRequest, NextResponse } from 'next/server'
import { geocodeMultiple } from '@/app/lib/nominatim'
import { GeocodeRequest, GeocodeResponse } from '@/app/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: GeocodeRequest = await request.json()

    // Validate input
    if (!body.addresses || !Array.isArray(body.addresses)) {
      return NextResponse.json(
        { error: 'Missing or invalid addresses array', errorCode: 'MISSING_ADDRESSES' },
        { status: 400 }
      )
    }

    if (body.addresses.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 address required', errorCode: 'EMPTY_ADDRESSES' },
        { status: 400 }
      )
    }

    // 30 stops (AddressForm's MAX_STOPS) + the start/return address
    if (body.addresses.length > 31) {
      return NextResponse.json(
        { error: 'Maximum 31 addresses allowed', errorCode: 'TOO_MANY_ADDRESSES' },
        { status: 400 }
      )
    }

    // Validate each address object
    for (const addr of body.addresses) {
      if (!addr.id || !addr.text || addr.order === undefined) {
        return NextResponse.json(
          { error: 'Each address must have id, text, and order', errorCode: 'INVALID_ADDRESS_FORMAT' },
          { status: 400 }
        )
      }
      if (addr.text.trim().length === 0 || addr.text.length > 200) {
        return NextResponse.json(
          { error: 'Each address must be 1-200 characters', errorCode: 'INVALID_ADDRESS_FORMAT' },
          { status: 400 }
        )
      }
    }

    // Geocode addresses
    const response: GeocodeResponse = await geocodeMultiple(
      body.addresses.map((a) => a.text)
    )

    // Cache with Vercel's edge cache
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Check if it's a rate limit issue
    if (message.includes('429') || message.includes('rate')) {
      return NextResponse.json(
        {
          error: 'Geocoding service temporarily rate-limited. Please try again in a moment.',
          errorCode: 'RATE_LIMITED',
          retryAfter: 5,
        },
        { status: 429, headers: { 'Retry-After': '5' } }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Geocoding service temporarily unavailable. Please try again in a moment.',
        errorCode: 'SERVICE_UNAVAILABLE',
        retryAfter: 5,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
