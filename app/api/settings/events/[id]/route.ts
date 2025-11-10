import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import DOMPurify from 'isomorphic-dompurify';

/**
 * Check if a string is a valid UUID format
 */
function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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

// Type for event update data
interface EventUpdateData {
  title?: string;
  description?: string;
  eventDate?: string;
  eventTime?: string;
  address?: string;
  isPublished?: boolean;
}

// Validation helper for event data
function validateEventData(data: EventUpdateData): { isValid: boolean; error?: string } {
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      return { isValid: false, error: "Title cannot be empty" };
    }
    if (data.title.length > 200) {
      return { isValid: false, error: "Title must be 200 characters or less" };
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.trim().length === 0) {
      return { isValid: false, error: "Description cannot be empty" };
    }
    if (data.description.length > 1000) {
      return { isValid: false, error: "Description must be 1000 characters or less" };
    }
  }

  if (data.eventDate !== undefined) {
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
  }

  if (data.eventTime !== undefined) {
    if (typeof data.eventTime !== 'string' || data.eventTime.trim().length === 0) {
      return { isValid: false, error: "Event time cannot be empty" };
    }
    if (data.eventTime.length > 50) {
      return { isValid: false, error: "Event time must be 50 characters or less" };
    }
  }

  if (data.address !== undefined) {
    if (typeof data.address !== 'string' || data.address.trim().length === 0) {
      return { isValid: false, error: "Address cannot be empty" };
    }
    if (data.address.length > 500) {
      return { isValid: false, error: "Address must be 500 characters or less" };
    }
  }

  return { isValid: true };
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/settings/events/[id] - Update an event
export async function PATCH(request: Request, props: RouteParams) {
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

    const { id } = await props.params;

    // Validate UUID format to prevent injection
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid event ID format" },
        { status: 400 }
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

    // Build update data with HTML sanitization to prevent XSS
    const updateData: Partial<{
      title: string;
      description: string;
      eventDate: Date;
      eventTime: string;
      address: string;
      isPublished: boolean;
    }> = {};

    if (body.title !== undefined) updateData.title = DOMPurify.sanitize(body.title.trim(), { ALLOWED_TAGS: [] });
    if (body.description !== undefined) updateData.description = DOMPurify.sanitize(body.description.trim(), { ALLOWED_TAGS: [] });
    if (body.eventDate !== undefined) updateData.eventDate = parseDateAtNoon(body.eventDate);
    if (body.eventTime !== undefined) updateData.eventTime = DOMPurify.sanitize(body.eventTime.trim(), { ALLOWED_TAGS: [] });
    if (body.address !== undefined) updateData.address = DOMPurify.sanitize(body.address.trim(), { ALLOWED_TAGS: [] });
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

    // Update with atomic operation - combines ownership check and update
    // This prevents TOCTOU (Time-of-check-time-of-use) vulnerability
    const result = await prisma.event.updateMany({
      where: {
        id,
        churchId: church.id  // Enforce ownership in the same query
      },
      data: updateData
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Fetch the updated event to return
    const event = await prisma.event.findUnique({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error("Failed to update event:", error);

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
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/events/[id] - Delete an event
export async function DELETE(request: Request, props: RouteParams) {
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

    const { id } = await props.params;

    // Validate UUID format to prevent injection
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid event ID format" },
        { status: 400 }
      );
    }

    // Delete with atomic operation - combines ownership check and delete
    // This prevents TOCTOU (Time-of-check-time-of-use) vulnerability
    const result = await prisma.event.deleteMany({
      where: {
        id,
        churchId: church.id  // Enforce ownership in the same query
      }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete event:", error);

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
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
