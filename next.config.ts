import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  webpack: (config) => {
    // Reducir la frecuencia de las verificaciones del sistema de archivos
    config.watchOptions = {
      ...config.watchOptions,
      poll: false, // Deshabilitar polling
      aggregateTimeout: 300, // Esperar después de un cambio antes de volver a compilar
      ignored: /node_modules/, // Ignorar node_modules
    };
    return config;
  },
};

export default nextConfig;
