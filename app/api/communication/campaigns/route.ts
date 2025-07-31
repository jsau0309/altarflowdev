import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Handles GET requests to retrieve all email campaigns for the authenticated user's church.
 *
 * Authenticates the user and organization, verifies the existence of the associated church, and returns a list of email campaigns ordered by creation date. Responds with appropriate HTTP status codes for unauthorized access, missing church, or server errors.
 *
 * @returns A JSON response containing an array of email campaigns or an error message.
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

    // Get campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      where: { churchId: church.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        totalRecipients: true,
        sentCount: true,
        createdAt: true,
        sentBy: true,
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to create a new email campaign for the authenticated church.
 *
 * Authenticates the user and organization, verifies the user's role as "ADMIN" or "STAFF", and ensures the church exists. Parses campaign details from the request body and creates a new email campaign associated with the church and sender.
 *
 * @returns A JSON response containing the created campaign, or an error message with the appropriate HTTP status code if authentication, authorization, or validation fails.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or staff
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) {
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
    const { subject, previewText, contentJson, htmlContent, status = "DRAFT" } = body;

    // Create campaign
    const campaign = await prisma.emailCampaign.create({
      data: {
        churchId: church.id,
        subject,
        previewText,
        contentJson,
        htmlContent,
        status,
        sentBy: userId,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}