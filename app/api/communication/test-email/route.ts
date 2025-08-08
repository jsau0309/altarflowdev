import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';
import { ResendEmailService } from "@/lib/email/resend-service";
import { z } from "zod";
import { escapeHtml } from "@/lib/email/escape-html";

const testEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "Email content is required"),
  previewText: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or staff
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get church from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true, name: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = testEmailSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { to, subject, html, previewText } = validation.data;

    // Add preview text to HTML if provided
    let finalHtml = html;
    if (previewText) {
      // Add hidden preview text at the beginning of the email
      const escapedPreviewText = escapeHtml(previewText);
      const hiddenPreviewText = `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapedPreviewText}</div>`;
      finalHtml = hiddenPreviewText + html;
    }

    // Add test unsubscribe footer
    const testUnsubscribeFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          ${escapeHtml(church.name)} • 
          <a href="#" style="color: #666; text-decoration: underline;">Unsubscribe</a>
          <br />
          <span style="font-size: 11px; color: #999;">(This is a test email - unsubscribe link is not active)</span>
        </p>
      </div>
    `;
    
    // Add unsubscribe footer to HTML
    finalHtml = finalHtml.replace('</body>', `${testUnsubscribeFooter}</body>`);
    if (!finalHtml.includes('</body>')) {
      finalHtml += testUnsubscribeFooter;
    }

    // Send test email
    const result = await ResendEmailService.sendTestEmail({
      to,
      subject,
      html: finalHtml,
      churchName: church.name,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      id: result.id,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to send test email"
      },
      { status: 500 }
    );
  }
}