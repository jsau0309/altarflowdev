import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    // Get all members with their email preferences
    const members = await prisma.member.findMany({
      where: { 
        churchId: church.id,
        email: { not: null }, // Only members with email
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        membershipStatus: true,
        emailPreference: {
          select: {
            isSubscribed: true,
          },
        },
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    });

    // Transform the data to include subscription status
    const membersWithPreferences = members.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      membershipStatus: member.membershipStatus,
      isSubscribed: member.emailPreference?.isSubscribed ?? true, // Default to subscribed if no preference
    }));

    return NextResponse.json({ members: membersWithPreferences });
  } catch (error) {
    console.error("Error fetching members with email preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}