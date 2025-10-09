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
            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://*.googleapis.com https://*.gstatic.com https://*.clerk.dev https://glad-caiman-42.clerk.accounts.dev https://*.typeform.com https://embed.typeform.com https://assets.calendly.com;
            style-src 'self' 'unsafe-inline' https://*.stripe.com https://js.stripe.com https://checkout.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://*.googleapis.com https://maps.gstatic.com https://fonts.googleapis.com https://*.clerk.dev https://*.typeform.com blob: data:;
            img-src 'self' https://*.stripe.com data: blob: https://*.clerk.dev https://img.clerk.com https://zaczpdtpzphgfrphndqj.supabase.co https://*.typeform.com https://calendly.com;
            font-src 'self' https://fonts.gstatic.com;
            frame-src 'self' https://*.stripe.com https://*.hcaptcha.com https://hcaptcha.com *.google.com https://*.clerk.accounts.dev https://*.typeform.com https://form.typeform.com https://calendly.com;
            connect-src 'self' https://api.stripe.com https://m.stripe.network https://q.stripe.com https://maps.googleapis.com https://*.hcaptcha.com https://hcaptcha.com https://clerk.your-domain.com wss://clerk.your-domain.com https://api.clerk.dev https://glad-caiman-42.clerk.accounts.dev https://*.typeform.com https://api.typeform.com https://calendly.com;
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
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    }
                ],
            },
        ];
    },
};

export default nextConfig;
