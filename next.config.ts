/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用边缘运行时以支持流式响应
  runtime: 'edge',
  // 严格模式
  reactStrictMode: true,
  // 输出模式
  output: 'standalone',
};

export default nextConfig;
