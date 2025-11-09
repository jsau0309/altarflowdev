import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Validation helper for event data
function validateEventData(data: any): { isValid: boolean; error?: string } {
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
    const eventDate = new Date(data.eventDate);
    if (isNaN(eventDate.getTime())) {
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
    const body = await request.json();

    // Verify the event belongs to this church
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        churchId: church.id
      }
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Validate input
    const validation = validateEventData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.eventDate !== undefined) updateData.eventDate = new Date(body.eventDate);
    if (body.eventTime !== undefined) updateData.eventTime = body.eventTime.trim();
    if (body.address !== undefined) updateData.address = body.address.trim();
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

    // Update the event
    const event = await prisma.event.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error("Failed to update event:", error);
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

    // Verify the event belongs to this church before deleting
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        churchId: church.id
      }
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Delete the event
    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
