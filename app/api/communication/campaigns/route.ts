import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
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