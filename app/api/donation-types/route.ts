import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - List all donation types and campaigns for the authenticated church
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });
    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    const donationTypes = await prisma.donationType.findMany({
      where: { churchId: church.id },
      orderBy: [
        { isCampaign: "asc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ donationTypes });
  } catch (error) {
    console.error("[GET /api/donation-types] Error:", error);
    return NextResponse.json({ error: "Failed to fetch donation types" }, { status: 500 });
  }
}

// POST - Create a new campaign (admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });
    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      goalAmount,
      startDate,
      endDate,
      displayOrder = 0,
      isActive = true,
    } = body as {
      name: string;
      description?: string;
      goalAmount?: string | number | null;
      startDate?: string | null;
      endDate?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    };

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await prisma.donationType.findUnique({
      where: { churchId_name: { churchId: church.id, name } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "A type or campaign with this name already exists" }, { status: 409 });
    }

    const created = await prisma.donationType.create({
      data: {
        churchId: church.id,
        name,
        description,
        isRecurringAllowed: true,
        isCampaign: true,
        isActive,
        goalAmount: goalAmount == null ? null : String(goalAmount),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        displayOrder,
      },
    });

    return NextResponse.json({ campaign: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/donation-types] Error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
