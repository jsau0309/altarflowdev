import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Note: Using Node.js runtime (not edge) because Prisma requires Node.js
// This is fine for OG images as they're cached by social platforms

// Helper function to validate and sanitize logo URL
function validateLogoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    // Only allow http/https protocols (prevent javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn('[OG Image] Invalid protocol in logo URL:', parsed.protocol);
      return null;
    }
    // Verify it's likely an image by checking common image extensions
    const pathname = parsed.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));

    if (!hasValidExtension && !pathname.includes('/')) {
      // If no extension and not a path, might be invalid
      console.warn('[OG Image] URL does not appear to be an image:', url);
      return null;
    }

    return url;
  } catch (error) {
    console.error('[OG Image] Invalid logo URL:', url, error);
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ churchSlug: string }> }
) {
  try {
    const { churchSlug } = await params;

    // Get church data
    const church = await prisma.church.findUnique({
      where: { slug: churchSlug },
      select: {
        id: true,
        name: true,
        LandingPageConfig: true,
      },
    });

    if (!church) {
      return new Response('Church not found', { status: 404 });
    }

    const config = church.LandingPageConfig;
    const displayTitle = config?.customTitle || church.name;

    // Validate logo URL before using it
    const validatedLogoUrl = config?.logoUrl ? validateLogoUrl(config.logoUrl) : null;

    // Use solid color for OG image (Linktree style)
    const ogBackgroundColor = config?.ogBackgroundColor || '#3B82F6'; // Default blue

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: ogBackgroundColor,
            padding: '80px',
          }}
        >
          {/* Logo Circle - only render if we have a valid logo URL */}
          {validatedLogoUrl && (
            <div
              style={{
                display: 'flex',
                width: '200px',
                height: '200px',
                borderRadius: '100px',
                overflow: 'hidden',
                marginBottom: '48px',
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                border: '6px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <img
                src={validatedLogoUrl}
                width={200}
                height={200}
                style={{
                  objectFit: 'cover',
                }}
                alt="Logo"
              />
            </div>
          )}

          {/* Church Name */}
          <div
            style={{
              display: 'flex',
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '24px',
              maxWidth: '900px',
              letterSpacing: '-0.02em',
            }}
          >
            {displayTitle}
          </div>

          {/* URL */}
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.85)',
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            altarflow.com/{churchSlug}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('[OG Image Generation Error]:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
