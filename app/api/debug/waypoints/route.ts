import { NextRequest, NextResponse } from 'next/server'
import { RouteRequest } from '@/app/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: RouteRequest = await request.json()
  return NextResponse.json({
    message: 'Debug waypoints received',
    waypoints: body.waypoints,
    count: body.waypoints.length,
    coordinatesString: body.waypoints.map((wp) => `${wp.lon},${wp.lat}`).join(';'),
  })
}
