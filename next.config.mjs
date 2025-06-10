/** @type {import('next').NextConfig} */
const nextConfig = {
    // reactStrictMode: false, // <-- Removed temporary override
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    async headers() {
        const cspHeader = `
            default-src 'self';
            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://*.googleapis.com https://*.gstatic.com https://*.clerk.dev https://glad-caiman-42.clerk.accounts.dev;
            style-src 'self' 'unsafe-inline' https://*.stripe.com https://js.stripe.com https://checkout.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://*.googleapis.com https://maps.gstatic.com https://fonts.googleapis.com https://*.clerk.dev blob: data:;
            img-src 'self' https://*.stripe.com data: blob: https://*.clerk.dev https://img.clerk.com https://zaczpdtpzphgfrphndqj.supabase.co;
            font-src 'self' https://fonts.gstatic.com;
            frame-src 'self' https://*.stripe.com https://*.hcaptcha.com https://hcaptcha.com *.google.com https://*.clerk.accounts.dev;
            connect-src 'self' https://api.stripe.com https://m.stripe.network https://q.stripe.com https://maps.googleapis.com https://*.hcaptcha.com https://hcaptcha.com https://clerk.your-domain.com wss://clerk.your-domain.com https://api.clerk.dev https://glad-caiman-42.clerk.accounts.dev;
            worker-src 'self' blob: https://m.stripe.network;
            media-src 'self';
            object-src 'self' https://*.supabase.co https://zaczpdtpzphgfrphndqj.supabase.co;
            form-action 'self';
            frame-ancestors 'self';
            base-uri 'self';
        `;
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
