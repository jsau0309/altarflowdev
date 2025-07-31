import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { safeFormDataParse } from "@/lib/file-upload-stream";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting for file uploads (20 uploads per hour per user)
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      keyPrefix: `upload:${userId}`,
    });

    const headers = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429, headers }
      );
    }

    // Check if user is admin or staff
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || !["ADMIN", "STAFF"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
    }

    // Define file constraints
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const VALID_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    // Safely parse form data with size checking
    const { formData, error: parseError } = await safeFormDataParse(request, MAX_FILE_SIZE);
    
    if (parseError || !formData) {
      return NextResponse.json({ error: parseError || "Failed to parse upload" }, { status: 400, headers });
    }

    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers });
    }

    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400, headers }
      );
    }

    // Double-check file size (redundant but safe)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400, headers }
      );
    }

    const supabase = await createClient();
    
    // Generate secure unique filename
    // Extract and validate file extension
    const fileExt = file.name.split(".").pop()?.toLowerCase() || '';
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!validExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400, headers }
      );
    }
    
    // Use UUID for filename to prevent path traversal attacks
    const fileName = `email-images/${orgId}/${uuidv4()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("church-assets")
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500, headers }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("church-assets")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      filename: fileName,
    }, { headers });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500, headers }
    );
  }
}