/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/reportes/:path*',
        destination: '/api/reportes/:path*',
      },
    ];
  },
  // Necesario para que pdfkit funcione en API routes (módulos Node nativos)
  serverExternalPackages: ['pdfkit'],
  // Permitir imágenes locales del servidor en producción
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
