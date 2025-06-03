/** @type {import('next').NextConfig} */
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
  // ... any other configurations you might have
};

module.exports = nextConfig;
