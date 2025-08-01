import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { AIService, ToneOption } from "@/lib/ai-service";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church details
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true, name: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    const body = await request.json();
    const { emailContent, tone, eventType, currentSubject } = body;

    if (!emailContent || !tone) {
      return NextResponse.json(
        { error: "Email content and tone are required" },
        { status: 400 }
      );
    }

    // Validate tone
    const validTones: ToneOption[] = ['friendly', 'formal', 'urgent', 'celebratory', 'informative'];
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: "Invalid tone selected" },
        { status: 400 }
      );
    }

    // Generate subject lines
    const suggestions = await AIService.generateSubjectLines({
      emailContent,
      churchName: church.name,
      tone: tone as ToneOption,
      eventType,
      currentSubject,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error generating subject lines:", error);
    return NextResponse.json(
      { error: "Failed to generate subject lines" },
      { status: 500 }
    );
  }
}