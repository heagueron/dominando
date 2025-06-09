// /home/heagueron/jmu/dominando/src/types/next-pwa.d.ts
declare module 'next-pwa' {
    import { NextConfig } from 'next';
  
    interface PWAConfig {
      dest?: string;
      disable?: boolean;
      register?: boolean;
      skipWaiting?: boolean;
      // Añade aquí otras opciones de configuración de next-pwa que uses
    }
  
    function withPWA(options: PWAConfig): (nextConfig: NextConfig) => NextConfig;
    export = withPWA;
  }