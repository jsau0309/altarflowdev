import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Force Node.js runtime (required for Prisma)
// Edge runtime cannot run Prisma due to file system requirements
export const runtime = 'nodejs';

// Helper function to validate and sanitize logo URL
function validateLogoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    // Only allow http/https protocols (prevent javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      logger.warn('Invalid protocol in logo URL', { operation: 'api.og.invalid_protocol', protocol: parsed.protocol, url });
      return null;
    }
    // Verify it's likely an image by checking common image extensions
    const pathname = parsed.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));

    if (!hasValidExtension && !pathname.includes('/')) {
      // If no extension and not a path, might be invalid
      logger.warn('URL does not appear to be an image', { operation: 'api.og.invalid_image_url', url, pathname });
      return null;
    }

    return url;
  } catch (error) {
    logger.error('[OG Image] Invalid logo URL', { operation: 'api.og.invalid_logo_url', url }, error instanceof Error ? error : new Error(String(error)));
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
    logger.error('[OG Image Generation Error]:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return new Response('Failed to generate image', { status: 500 });
  }
}
