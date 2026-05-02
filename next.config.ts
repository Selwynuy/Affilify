import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Spectre-class isolation. COOP cuts cross-origin window references;
          // CORP blocks no-cors cross-origin embedding of our resources.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Supabase storage, Replicate CDN, TikTok CDN, and data URIs for generated images
              "img-src 'self' data: blob: https://*.supabase.co https://pbxt.replicate.delivery https://replicate.delivery https://*.tiktokcdn.com",
              // WebSockets for Supabase realtime, Gemini API, Replicate, PayMongo, TikTok, Resend
              "connect-src 'self' wss://*.supabase.co https://*.supabase.co https://generativelanguage.googleapis.com https://api.replicate.com https://api.paymongo.com https://api.resend.com https://open.tiktokapis.com",
              "media-src 'self' blob: https://*.supabase.co https://pbxt.replicate.delivery",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
