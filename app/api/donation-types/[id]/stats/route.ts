import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface Params { id: string }

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const church = await prisma.church.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
    if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

    const donationType = await prisma.donationType.findFirst({ where: { id, churchId: church.id } });
    if (!donationType) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Aggregate stats from DonationTransaction
    const [sumResult, countResult, donorCountResult] = await Promise.all([
      prisma.donationTransaction.aggregate({
        _sum: { amount: true },
        where: { churchId: church.id, donationTypeId: id, status: "succeeded" },
      }),
      prisma.donationTransaction.count({ where: { churchId: church.id, donationTypeId: id, status: "succeeded" } }),
      prisma.donationTransaction.groupBy({
        by: ["donorId"],
        where: { churchId: church.id, donationTypeId: id, status: "succeeded", donorId: { not: null } },
      }),
    ]);

    const totalRaisedCents = sumResult._sum.amount ?? 0;
    const totalRaised = Number((totalRaisedCents / 100).toFixed(2));
    const transactionCount = countResult;
    const donorCount = donorCountResult.length;

    const goalAmountNum = donationType.goalAmount ? Number(donationType.goalAmount) : null;
    const progressPercent = goalAmountNum ? Math.min(100, Math.round((totalRaised / goalAmountNum) * 100)) : 0;
    const isGoalReached = goalAmountNum ? totalRaised >= goalAmountNum : false;

    let daysRemaining: number | null = null;
    if (donationType.endDate) {
      const now = new Date();
      const end = donationType.endDate;
      const diffMs = end.getTime() - now.getTime();
      daysRemaining = diffMs <= 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      totalRaised,
      donorCount,
      transactionCount,
      goalAmount: goalAmountNum,
      progressPercent,
      isGoalReached,
      daysRemaining,
    });
  } catch (error) {
    console.error("[GET /api/donation-types/[id]/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
