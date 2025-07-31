import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AIService, ToneOption } from "@/lib/ai-service";

/**
 * Handles POST requests to generate preview text suggestions for emails using AI.
 *
 * Authenticates the user and organization, validates the request body for required fields and tone, and returns AI-generated preview text suggestions based on the provided subject line, email content, tone, and optional current preview. Responds with appropriate error messages and status codes for authentication, validation, or processing failures.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subjectLine, emailContent, tone, currentPreview } = body;

    if (!subjectLine || !emailContent || !tone) {
      return NextResponse.json(
        { error: "Subject line, email content, and tone are required" },
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

    // Generate preview text suggestions
    const suggestions = await AIService.generatePreviewText({
      subjectLine,
      emailContent,
      tone: tone as ToneOption,
      currentPreview,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error generating preview text:", error);
    return NextResponse.json(
      { error: "Failed to generate preview text" },
      { status: 500 }
    );
  }
}