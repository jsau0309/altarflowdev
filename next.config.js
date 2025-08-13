/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'testaltarflow.ngrok.app',
        port: '',
        pathname: '/images/**', // Or be more specific if needed, e.g., '/images/Altarflow.png'
      },
      // You can add other hostnames here if needed in the future
      // {
      //   protocol: 'https',
      //   hostname: 'another-domain.com',
      // },
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
  
  // Use SWC to transpile and minify the SDK
  transpileClientSDK: true,
};

// Export with Sentry configuration
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);