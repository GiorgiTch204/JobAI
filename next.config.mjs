/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 ships a native .node binary and pdf/docx parsers use Node
  // built-ins, so they must stay outside the server bundle.
  serverExternalPackages: ["better-sqlite3", "pdf-parse", "mammoth"],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
