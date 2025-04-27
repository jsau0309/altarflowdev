/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... potentially other existing configurations ...

  webpack: (config, { isServer }) => {
    // Mark canvas as external for server-side bundles
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
  
  // ... potentially other existing configurations ...
};

module.exports = nextConfig; 