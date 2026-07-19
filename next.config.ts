import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Railway Docker / 셀프호스팅
  output: "standalone",
  // 개발 모드 좌하단 Next.js "N" 배지 숨김
  devIndicators: false,
  // 상위 디렉토리의 lockfile을 잘못 잡지 않도록 트레이싱 루트를 프로젝트로 고정
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
