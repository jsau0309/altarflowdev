import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

// GET /api/public/events/[slug] - Get published events for a church by slug
export async function GET(request: Request, props: RouteParams) {
  try {
    const { slug } = await props.params;

    // Find the church by slug
    const church = await prisma.church.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Get current date at start of day (midnight) for consistent comparison
    // This prevents today's events from being classified as "past" after noon
    const now = new Date();
    now.setHours(0, 0, 0, 0);  // Set to midnight local time

    // Get published events, split into upcoming and past
    const allEvents = await prisma.event.findMany({
      where: {
        churchId: church.id,
        isPublished: true
      },
      orderBy: {
        eventDate: 'asc'
      }
    });

    // Split events into upcoming and past using day-level comparison
    const upcomingEvents = allEvents.filter(event => {
      const eventDay = new Date(event.eventDate);
      eventDay.setHours(0, 0, 0, 0);
      return eventDay >= now;
    });

    const pastEvents = allEvents.filter(event => {
      const eventDay = new Date(event.eventDate);
      eventDay.setHours(0, 0, 0, 0);
      return eventDay < now;
    }).reverse(); // Most recent past events first

    return NextResponse.json({
      success: true,
      upcomingEvents,
      pastEvents
    });
  } catch (error) {
    logger.error('Failed to fetch public events:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
