/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Tree-shakes these libraries so a client component that imports one
  // helper doesn't pull the whole package into every route's bundle.
  experimental: {
    optimizePackageImports: ["gsap", "framer-motion"],
  },

  // Frame sequences and media are content-addressed by their filenames and
  // never change in place — serve them immutable so the browser never
  // revalidates (Vercel's default for public/ is max-age=0,must-revalidate,
  // which costs a network round trip per frame on every re-request; the
  // sliding-window loader re-fetches evicted frames when scrolling back,
  // so that default made back-scrolling pay full latency per frame).
  // vercel.json carries the same rule for Vercel's edge; this covers
  // next start / self-hosting.
  async headers() {
    return [
      {
        source: "/:prefix(assets|sections|music|sounds|fonts)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
