import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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

// Validation helper for event data
function validateEventData(data: any): { isValid: boolean; error?: string } {
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
  } catch (error) {
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

    // Create the event
    const event = await prisma.event.create({
      data: {
        churchId: church.id,
        title: body.title.trim(),
        description: body.description.trim(),
        eventDate: parseDateAtNoon(body.eventDate),
        eventTime: body.eventTime.trim(),
        address: body.address.trim(),
        isPublished: body.isPublished ?? true
      }
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
