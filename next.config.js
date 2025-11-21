/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Increase body size limit for server actions and API routes (image uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB uploads
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'testaltarflow.ngrok.app',
        port: '',
        pathname: '/images/**', // Or be more specific if needed, e.g., '/images/Altarflow.png'
      },
      {
        protocol: 'https',
        hostname: 'uhoovjoeitxecfcbzndj.supabase.co', // Dev Supabase
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'qdoyonfjxwqefvsfjchx.supabase.co', // Prod Supabase
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Temporarily disable ESLint during build
  // TODO: Remove after completing ESLint cleanup (see todo/ESLINT_CLEANUP_PLAN.md)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  },
  // ... any other configurations you might have
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // Automatically upload source maps during build
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from public access
  hideSourceMaps: true,

  // Disable source map uploading in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',

  // Disable telemetry to reduce build noise
  telemetry: false,

  // Use SWC to transpile and minify the SDK
  transpileClientSDK: true,
};

// Export with Sentry configuration
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);