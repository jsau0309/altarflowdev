import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limiter = rateLimit({ windowMs: 60000, max: 10 });
  const rateLimitResult = await limiter(request);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { 
        status: 429
      }
    );
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Subscribe token is required" },
        { status: 400 }
      );
    }

    // Find the email preference by token
    const emailPreference = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
      include: { member: true },
    });

    if (!emailPreference) {
      return NextResponse.json(
        { error: "Invalid subscribe token" },
        { status: 404 }
      );
    }

    // Update the preference to subscribed
    await prisma.emailPreference.update({
      where: { id: emailPreference.id },
      data: {
        isSubscribed: true,
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully resubscribed",
    });
  } catch (error) {
    console.error("Error processing resubscribe:", error);
    return NextResponse.json(
      { error: "Failed to process resubscribe request" },
      { status: 500 }
    );
  }
}