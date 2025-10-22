import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getBackgroundStyle } from '@/lib/landing-page/background-presets';

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
    const description = config?.description || `Connect with ${church.name}`;

    // Get background gradient
    const backgroundType = config?.backgroundType || 'PRESET';
    const backgroundValue = config?.backgroundValue || 'preset-1';
    const backgroundStyle = getBackgroundStyle(backgroundType, backgroundValue);

    // Parse background to get gradient for OG image
    const getBackgroundForOG = (style: string) => {
      // Extract the gradient from the style string
      if (style.includes('linear-gradient')) {
        return style;
      }
      // Default gradient
      return 'linear-gradient(90deg, hsla(217, 91%, 60%, 1) 0%, hsla(0, 0%, 75%, 1) 99%)';
    };

    const background = getBackgroundForOG(backgroundStyle);

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
            background: background,
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Content Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            {/* Logo */}
            {config?.logoUrl ? (
              <div
                style={{
                  display: 'flex',
                  width: '180px',
                  height: '180px',
                  borderRadius: '90px',
                  overflow: 'hidden',
                  marginBottom: '40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={config.logoUrl}
                  width={180}
                  height={180}
                  style={{
                    objectFit: 'cover',
                  }}
                  alt="Logo"
                />
              </div>
            ) : (
              <div style={{ display: 'none' }} />
            )}

            {/* Title */}
            <div
              style={{
                display: 'flex',
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                marginBottom: '20px',
                textShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxWidth: '900px',
              }}
            >
              {displayTitle}
            </div>

            {/* Description */}
            <div
              style={{
                display: description ? 'flex' : 'none',
                fontSize: '32px',
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                maxWidth: '800px',
                lineHeight: 1.4,
              }}
            >
              {description && description.length > 120
                ? description.substring(0, 120) + '...'
                : description || ''}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '40px',
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.7)',
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
