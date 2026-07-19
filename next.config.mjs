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
};

export default nextConfig;
