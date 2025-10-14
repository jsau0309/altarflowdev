import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
    if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

    const now = new Date();

    // Fetch defaults and candidate active campaigns by date and active flag
    const donationTypes = await prisma.donationType.findMany({
      where: {
        churchId: church.id,
        OR: [
          { isCampaign: false },
          {
            isCampaign: true,
            isActive: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            ],
          },
        ],
      },
      orderBy: [
        { isCampaign: "asc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Compute sums per donationTypeId to filter out goal-reached campaigns
    const campaignIds = donationTypes.filter(dt => dt.isCampaign).map(dt => dt.id);
    let sumsById: Record<string, number> = {};
    if (campaignIds.length > 0) {
      const grouped = await prisma.donationTransaction.groupBy({
        by: ["donationTypeId"],
        _sum: { amount: true },
        where: { churchId: church.id, status: "succeeded", donationTypeId: { in: campaignIds } },
      });
      for (const g of grouped) {
        sumsById[g.donationTypeId] = g._sum.amount ?? 0;
      }
    }

    const filtered = donationTypes.filter(dt => {
      if (!dt.isCampaign) return true; // defaults always present
      if (!dt.goalAmount) return true; // no goal, stays active until endDate/inactive
      const raisedCents = sumsById[dt.id] ?? 0;
      const goalCents = Math.round(Number(dt.goalAmount) * 100);
      return raisedCents < goalCents; // hide if goal reached
    });

    return NextResponse.json({ donationTypes: filtered });
  } catch (error) {
    console.error("[GET /api/donation-types/active] Error:", error);
    return NextResponse.json({ error: "Failed to fetch active donation types" }, { status: 500 });
  }
}
