import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Handles POST requests to unsubscribe a user based on a provided token.
 *
 * Expects a JSON payload containing an unsubscribe token. If the token is valid, marks the user's email preference as unsubscribed and updates any pending email recipient records to reflect the unsubscription. Returns a JSON response indicating success or an appropriate error message.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
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
        { error: "Invalid unsubscribe token" },
        { status: 404 }
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
    });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}