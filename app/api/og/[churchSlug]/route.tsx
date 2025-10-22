import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Note: Using Node.js runtime (not edge) because Prisma requires Node.js
// This is fine for OG images as they're cached by social platforms

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
          {/* Logo Circle */}
          {config?.logoUrl && (
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
                src={config.logoUrl}
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
