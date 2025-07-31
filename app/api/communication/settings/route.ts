import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Handles GET requests to retrieve email settings for the authenticated church organization.
 *
 * Authenticates the user and organization, fetches the church by organization ID, and returns the associated email settings as JSON. Responds with appropriate HTTP status codes for unauthorized access, missing church records, or server errors.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church ID from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Get email settings
    const settings = await prisma.emailSettings.findUnique({
      where: { churchId: church.id },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * Handles updating or creating email settings for a church organization.
 *
 * Authenticates the user and organization, verifies the user has an "ADMIN" role, and upserts email settings (sender name, reply-to email, timezone, and footer address) for the associated church. Returns the updated or created settings as JSON, or an appropriate error response if authentication, authorization, or data retrieval fails.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get church ID from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    const body = await request.json();
    const { senderName, replyToEmail, timezone, footerAddress } = body;

    // Upsert email settings
    const settings = await prisma.emailSettings.upsert({
      where: { churchId: church.id },
      update: {
        senderName,
        replyToEmail,
        timezone,
        footerAddress,
      },
      create: {
        churchId: church.id,
        senderName,
        replyToEmail,
        timezone,
        footerAddress,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error saving email settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}