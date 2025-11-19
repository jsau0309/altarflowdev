import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import DOMPurify from 'isomorphic-dompurify';

/**
 * Convert a date string (YYYY-MM-DD) to a Date object at noon local time.
 * This prevents timezone-related date shifts when storing date-only values.
 *
 * Example: "2025-11-10" becomes November 10, 2025 at 12:00:00 local time
 * instead of November 9, 2025 at 19:00:00 (if parsed as UTC in EST timezone)
 */
function parseDateAtNoon(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

// Type for event creation data
interface EventCreateData {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  address: string;
  isPublished?: boolean;
}

// Validation helper for event data
function validateEventData(data: EventCreateData): { isValid: boolean; error?: string } {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    return { isValid: false, error: "Title is required" };
  }

  if (data.title.length > 200) {
    return { isValid: false, error: "Title must be 200 characters or less" };
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    return { isValid: false, error: "Description is required" };
  }

  if (data.description.length > 1000) {
    return { isValid: false, error: "Description must be 1000 characters or less" };
  }

  if (!data.eventDate) {
    return { isValid: false, error: "Event date is required" };
  }

  // Validate date format (YYYY-MM-DD)
  if (typeof data.eventDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) {
    return { isValid: false, error: "Invalid event date format. Expected YYYY-MM-DD" };
  }

  try {
    const eventDate = parseDateAtNoon(data.eventDate);
    if (isNaN(eventDate.getTime())) {
      return { isValid: false, error: "Invalid event date" };
    }

    // Validate date is within reasonable range
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5); // 5 years in future

    if (eventDate > maxFutureDate) {
      return { isValid: false, error: "Event date cannot be more than 5 years in the future" };
    }

    const minPastDate = new Date();
    minPastDate.setFullYear(minPastDate.getFullYear() - 10); // 10 years in past

    if (eventDate < minPastDate) {
      return { isValid: false, error: "Event date cannot be more than 10 years in the past" };
    }
  } catch {
    return { isValid: false, error: "Invalid event date format" };
  }

  if (!data.eventTime || typeof data.eventTime !== 'string' || data.eventTime.trim().length === 0) {
    return { isValid: false, error: "Event time is required" };
  }

  if (data.eventTime.length > 50) {
    return { isValid: false, error: "Event time must be 50 characters or less" };
  }

  if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
    return { isValid: false, error: "Address is required" };
  }

  if (data.address.length > 500) {
    return { isValid: false, error: "Address must be 500 characters or less" };
  }

  return { isValid: true };
}

// GET /api/settings/events - Get all events for the church
export async function GET() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    const church = await prisma.church.findFirst({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Get all events for this church, ordered by date (upcoming first, then past)
    const events = await prisma.event.findMany({
      where: { churchId: church.id },
      orderBy: [
        { eventDate: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);

    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('P2024') || error.message.includes('connection pool')) {
        return NextResponse.json(
          { error: "Database connection issue. Please try again." },
          { status: 503 }
        );
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Request timed out. Please try again." },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/settings/events - Create a new event
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization" },
        { status: 401 }
      );
    }

    const church = await prisma.church.findFirst({
      where: { clerkOrgId: orgId },
      select: { id: true }
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateEventData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check event count limit per church (prevent abuse)
    const eventCount = await prisma.event.count({
      where: { churchId: church.id }
    });

    const MAX_EVENTS_PER_CHURCH = 100;
    if (eventCount >= MAX_EVENTS_PER_CHURCH) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_EVENTS_PER_CHURCH} events allowed. Please delete old events first.` },
        { status: 400 }
      );
    }

    // Sanitize all text inputs to prevent XSS
    const sanitizedTitle = DOMPurify.sanitize(body.title.trim(), { ALLOWED_TAGS: [] });
    const sanitizedDescription = DOMPurify.sanitize(body.description.trim(), { ALLOWED_TAGS: [] });
    const sanitizedEventTime = DOMPurify.sanitize(body.eventTime.trim(), { ALLOWED_TAGS: [] });
    const sanitizedAddress = DOMPurify.sanitize(body.address.trim(), { ALLOWED_TAGS: [] });

    // Create the event
    const event = await prisma.event.create({
      data: {
        churchId: church.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        eventDate: parseDateAtNoon(body.eventDate),
        eventTime: sanitizedEventTime,
        address: sanitizedAddress,
        isPublished: body.isPublished ?? true
      }
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error("Failed to create event:", error);

    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('P2024') || error.message.includes('connection pool')) {
        return NextResponse.json(
          { error: "Database connection issue. Please try again." },
          { status: 503 }
        );
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Request timed out. Please try again." },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
