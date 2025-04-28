import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Corrected import

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("GET Church Profile Auth Error:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the user's profile to get their churchId
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { churchId: true },
    });

    if (!userProfile || !userProfile.churchId) {
      console.error(`User ${user.id} profile or churchId not found.`);
      return NextResponse.json({ error: "User profile or church association not found" }, { status: 404 });
    }

    // Fetch the church details using the churchId
    const church = await prisma.church.findUnique({
      where: { id: userProfile.churchId },
      select: {
        id: true, // Include id for potential future use
        name: true,
        phone: true,
        address: true,
        website: true,
      },
    });

    if (!church) {
      console.error(`Church not found for churchId: ${userProfile.churchId}`);
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    return NextResponse.json(church);

  } catch (error) {
    console.error("GET Church Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("PUT Church Profile Auth Error:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let churchData;
  try {
    churchData = await request.json();
  } catch (error) {
    console.error("PUT Church Profile - Invalid JSON:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Basic validation (can be enhanced with Zod)
  if (!churchData || typeof churchData.name !== 'string' || churchData.name.trim() === '') {
    return NextResponse.json({ error: "Invalid data: Church name is required" }, { status: 400 });
  }

  try {
    // Find the user's profile to get their churchId and potentially role for validation
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { churchId: true, role: true }, // Include role if needed for permission checks
    });

    if (!userProfile || !userProfile.churchId) {
      console.error(`User ${user.id} profile or churchId not found for update.`);
      return NextResponse.json({ error: "User profile or church association not found" }, { status: 404 });
    }

    // Optional: Add role-based permission check here if needed
    // if (userProfile.role !== 'ADMIN') { 
    //   return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    // }

    // Prepare data for update (ensure only allowed fields are updated)
    const dataToUpdate = {
      name: churchData.name,
      phone: churchData.phone || null, // Set to null if empty/undefined
      address: churchData.address || null,
      website: churchData.website || null,
    };

    // Update the church details
    const updatedChurch = await prisma.church.update({
      where: { id: userProfile.churchId },
      data: dataToUpdate,
      select: { // Return the updated data
        id: true,
        name: true,
        phone: true,
        address: true,
        website: true,
      },
    });

    return NextResponse.json(updatedChurch);

  } catch (error) {
    console.error("PUT Church Profile Error:", error);
    // Handle potential Prisma errors like unique constraint violations if necessary
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 