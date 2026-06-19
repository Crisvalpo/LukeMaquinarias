/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para que pdfkit funcione en API routes (módulos Node nativos)
  serverExternalPackages: ['pdfkit'],
  // Permitir imágenes locales del servidor en producción
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
