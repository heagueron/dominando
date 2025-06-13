import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '', // Dejar vacío para cualquier puerto (o especificar si es necesario)
        pathname: '/a/**', // Permite cualquier imagen bajo la ruta /a/ (común para avatares de Google)
      },
      // Puedes añadir más patrones aquí para otros dominios si los necesitas
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default pwaConfig(nextConfig);
