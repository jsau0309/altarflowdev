import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitConfigs, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, {
    ...rateLimitConfigs.unsubscribe,
    keyPrefix: 'unsubscribe',
  });

  // Add rate limit headers to all responses
  const headers = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { 
        status: 429,
        headers,
      }
    );
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400, headers }
      );
    }

    // Find the email preference by token
    const emailPreference = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
      include: { member: true },
    });

    if (!emailPreference) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 404, headers }
      );
    }

    // Update the preference to unsubscribed
    await prisma.emailPreference.update({
      where: { id: emailPreference.id },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });

    // Also mark any pending email recipients as unsubscribed
    await prisma.emailRecipient.updateMany({
      where: {
        memberId: emailPreference.memberId,
        status: "PENDING",
      },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    }, { headers });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500, headers }
    );
  }
}