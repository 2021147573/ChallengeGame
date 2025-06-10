import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "챌린지게임 🎯 - 목표를 게임처럼! 팀과 함께 도전하라!",
  description: "매번 실패했던 목표들, 이제는 혼자가 아니라 팀과 함께 도전하세요! 챌린지게임은 팀이 모여 목표를 정하고, 미션을 게임처럼 클리어하는 새로운 도전 플랫폼입니다.",
  keywords: ["챌린지", "게임", "목표달성", "팀", "걸음수", "다이어트", "운동", "건강"],
  authors: [{ name: "챌린지게임팀" }],
  openGraph: {
    title: "챌린지게임 🎯 - 목표를 게임처럼! 팀과 함께 도전하라!",
    description: "매번 실패했던 목표들, 이제는 혼자가 아니라 팀과 함께 도전하세요! 팀이 모여 목표를 정하고, 미션을 게임처럼 클리어하는 새로운 도전 플랫폼입니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "챌린지게임",
  },
  twitter: {
    card: "summary_large_image",
    title: "챌린지게임 🎯 - 목표를 게임처럼! 팀과 함께 도전하라!",
    description: "매번 실패했던 목표들, 이제는 혼자가 아니라 팀과 함께 도전하세요! 팀이 모여 목표를 정하고, 미션을 게임처럼 클리어하는 새로운 도전 플랫폼입니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
