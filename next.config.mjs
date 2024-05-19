/** @type {import('next').NextConfig} */
const nextConfig = {
  env:{
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
  }
};

export default nextConfig;
