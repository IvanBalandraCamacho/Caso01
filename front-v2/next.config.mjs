/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", 
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
  },
}

export default nextConfig