import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "재테크 엔진 — 인생설계 플랫폼",
  description:
    "내 재테크 엔진을 직접 조립하고, n년 뒤 자산을 미리 본다. 모든 수치는 예시·가정.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
