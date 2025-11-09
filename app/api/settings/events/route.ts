import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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

  // Validate date format
  const eventDate = new Date(data.eventDate);
  if (isNaN(eventDate.getTime())) {
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
        eventDate: new Date(body.eventDate),
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
