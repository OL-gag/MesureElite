// POST /api/route
// Calculate optimized route using OSRM (per contracts/api-route.md)

import { NextRequest, NextResponse } from 'next/server'
import { calculateRoute } from '@/app/lib/osrm'
import { RouteRequest, RouteResponse } from '@/app/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RouteRequest = await request.json()

    // Validate input
    if (!body.waypoints || !Array.isArray(body.waypoints)) {
      return NextResponse.json(
        { error: 'Missing or invalid waypoints array' },
        { status: 400 }
      )
    }

    if (body.waypoints.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 waypoints required' },
        { status: 400 }
      )
    }

    if (body.waypoints.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 waypoints allowed' },
        { status: 400 }
      )
    }

    // Validate each waypoint
    for (const wp of body.waypoints) {
      if (!wp.id || wp.lat === undefined || wp.lon === undefined) {
        return NextResponse.json(
          { error: 'Each waypoint must have id, lat, and lon' },
          { status: 400 }
        )
      }
      if (wp.lat < -90 || wp.lat > 90 || wp.lon < -180 || wp.lon > 180) {
        return NextResponse.json(
          { error: 'Invalid coordinates for waypoint: ' + wp.id },
          { status: 400 }
        )
      }
    }

    // Ensure displayName is always present (required for OSRM)
    const validatedWaypoints = body.waypoints.map((wp, i) => ({
      ...wp,
      displayName: wp.displayName || `Point ${i + 1}`,
    }))

    console.log('[API/route] Validated waypoints:', JSON.stringify(validatedWaypoints, null, 2))

    // Calculate route
    const route = await calculateRoute(validatedWaypoints)

    if (route.status === 'failed') {
      return NextResponse.json(
        { error: route.error || 'Routing calculation failed' },
        { status: 400 }
      )
    }

    const response: RouteResponse = { route }

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
          error: 'Routing service temporarily rate-limited. Please try again in a moment.',
          retryAfter: 5,
        },
        { status: 429, headers: { 'Retry-After': '5' } }
      )
    }

    // Check for timeout
    if (message.includes('timeout') || message.includes('ECONNABORTED')) {
      return NextResponse.json(
        {
          error: 'Routing calculation timed out. Please try again.',
          retryAfter: 3,
        },
        { status: 503 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Routing service temporarily unavailable. Please try again in a moment.',
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
