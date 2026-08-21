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
        { error: 'Missing or invalid addresses array' },
        { status: 400 }
      )
    }

    if (body.addresses.length === 0) {
      return NextResponse.json({ error: 'At least 1 address required' }, { status: 400 })
    }

    if (body.addresses.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 addresses allowed' },
        { status: 400 }
      )
    }

    // Validate each address object
    for (const addr of body.addresses) {
      if (!addr.id || !addr.text || addr.order === undefined) {
        return NextResponse.json(
          { error: 'Each address must have id, text, and order' },
          { status: 400 }
        )
      }
      if (addr.text.trim().length === 0 || addr.text.length > 200) {
        return NextResponse.json(
          { error: 'Each address must be 1-200 characters' },
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
          retryAfter: 5,
        },
        { status: 429, headers: { 'Retry-After': '5' } }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Geocoding service temporarily unavailable. Please try again in a moment.',
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
