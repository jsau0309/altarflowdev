import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church profile
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
      },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    return NextResponse.json(church);
  } catch (error) {
    console.error("Error fetching church profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch church profile" },
      { status: 500 }
    );
  }
}