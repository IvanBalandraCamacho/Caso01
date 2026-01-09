/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone", // Deshabilitado para compilación local en Windows - habilitar para Docker
  
  // typescript: {
  //   ignoreBuildErrors: true,  // ⚠️ Deshabilitado para detectar errores en build
  // },
  images: {
    unoptimized: false,
  },
  
  serverExternalPackages: ['shiki'],

  // Optimización de bundle - tree-shaking para Ant Design e íconos
  transpilePackages: ['antd', '@ant-design/icons'],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'lucide-react'],
  },
}

export default nextConfig