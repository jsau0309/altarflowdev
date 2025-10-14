import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface Params {
  id: string;
}

// GET - Get a single donation type/campaign (scoped to church)
export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
    if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

    const donationType = await prisma.donationType.findFirst({
      where: { id, churchId: church.id },
    });
    if (!donationType) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ donationType });
  } catch (error) {
    console.error("[GET /api/donation-types/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH - Update a campaign (name, description, dates, goal, active)
export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
    if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

    const existing = await prisma.donationType.findFirst({ where: { id, churchId: church.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const updateData: any = {};

    if (typeof body.name === "string") updateData.name = body.name;
    if (typeof body.description !== "undefined") updateData.description = body.description ?? null;
    if (typeof body.goalAmount !== "undefined") updateData.goalAmount = body.goalAmount == null ? null : String(body.goalAmount);
    if (typeof body.displayOrder === "number") updateData.displayOrder = body.displayOrder;
    if (typeof body.startDate !== "undefined") updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (typeof body.endDate !== "undefined") updateData.endDate = body.endDate ? new Date(body.endDate) : null;

    if (typeof body.isActive !== "undefined") {
      if (!existing.isCampaign) {
        // Defaults cannot be deactivated
        return NextResponse.json({ error: "Default types cannot be deactivated" }, { status: 400 });
      }
      updateData.isActive = Boolean(body.isActive);
    }

    // Prevent changing isCampaign via API
    delete updateData.isCampaign;

    const updated = await prisma.donationType.update({ where: { id: existing.id }, data: updateData });
    return NextResponse.json({ donationType: updated });
  } catch (error) {
    console.error("[PATCH /api/donation-types/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - Soft delete (set isActive = false) for campaigns
export async function DELETE(_request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
    if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

    const existing = await prisma.donationType.findFirst({ where: { id, churchId: church.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!existing.isCampaign) return NextResponse.json({ error: "Default types cannot be deleted" }, { status: 400 });

    const updated = await prisma.donationType.update({ where: { id: existing.id }, data: { isActive: false } });
    return NextResponse.json({ donationType: updated });
  } catch (error) {
    console.error("[DELETE /api/donation-types/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
