import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { getAuth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  // Get user and organization context
  const { userId, orgId } = getAuth(request);

  if (!userId) { 
    console.error("GET Church Profile Auth Error: No Clerk userId found.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    console.error(`User ${userId} GET /church-profile without active org.`);
    return NextResponse.json({ error: "No active organization selected" }, { status: 400 });
    }

  try {
    // Fetch the church details using the clerkOrgId
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        clerkOrgId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        website: true,
        preferredLanguage: true,
      },
    });

    if (!church) {
      console.error(`Church not found for clerkOrgId: ${orgId}`);
      return NextResponse.json({ error: "Church profile not found for the active organization" }, { status: 404 });
    }

    return NextResponse.json(church);

  } catch (error) {
    console.error("GET Church Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let orgId: string | null | undefined = null;
  try {
    // 1. Get user and organization context
    const authResult = getAuth(request);
    const userId = authResult.userId;
    orgId = authResult.orgId;
    const orgRole = authResult.orgRole;

    if (!userId) { 
    console.error("PUT Church Profile Auth Error: No Clerk userId found.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
    if (!orgId) {
      console.error(`User ${userId} PUT /church-profile without active org.`);
      return NextResponse.json({ error: "No active organization selected" }, { status: 400 });
    }

    // 2. Authorization Check (e.g., only admins can update)
    if (orgRole !== 'org:admin') { 
       console.warn(`User ${userId} with role ${orgRole} attempted to update church profile.`);
       return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // 3. Parse and validate body
  let churchData;
  try {
    churchData = await request.json();
  } catch (error) {
    console.error("PUT Church Profile - Invalid JSON:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!churchData || typeof churchData.name !== 'string' || churchData.name.trim() === '') {
    return NextResponse.json({ error: "Invalid data: Church name is required" }, { status: 400 });
  }

    // 4. Prepare data for update
    // Validate preferredLanguage if provided
    let preferredLanguageToSet: string | undefined = undefined;
    if (typeof churchData.preferredLanguage === 'string') {
      const lowerLang = churchData.preferredLanguage.toLowerCase();
      if (lowerLang === 'en' || lowerLang === 'es') {
        preferredLanguageToSet = lowerLang;
      }
    }

    const dataToUpdate = {
      name: churchData.name,
      email: churchData.email || null,
      phone: churchData.phone || null, 
      address: churchData.address || null,
      website: churchData.website || null,
      ...(preferredLanguageToSet ? { preferredLanguage: preferredLanguageToSet } : {}),
    };

    // 5. Update the church details using clerkOrgId (or create if doesn't exist yet)
    // This handles race conditions where the webhook hasn't created the church yet
    const updatedChurch = await prisma.church.upsert({
      where: { clerkOrgId: orgId },
      update: dataToUpdate,
      create: {
        ...dataToUpdate,
        clerkOrgId: orgId,
        slug: orgId.toLowerCase().replace(/[^a-z0-9]+/g, '-'), // Generate slug from orgId
        onboardingStep: 3,
        onboardingCompleted: false,
      },
      select: { 
        id: true,
        clerkOrgId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        website: true,
        preferredLanguage: true,
      },
    });

    return NextResponse.json(updatedChurch);

  } catch (error) {
    console.error("PUT Church Profile Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        console.error(`Church update failed: Record not found for clerkOrgId ${orgId}`);
        return NextResponse.json({ error: 'Church profile not found for the active organization to update.' }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 