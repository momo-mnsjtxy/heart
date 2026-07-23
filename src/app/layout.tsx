import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import CrisisBanner from "@/components/CrisisBanner";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "心语 - 隐私优先的 AI 心理咨询",
  description:
    "安全、私密、温暖的 AI 心理健康支持平台。所有数据加密存储在您的设备上，我们绝不收集您的对话内容。",
  keywords: ["心理咨询", "AI", "隐私", "心理健康", "情绪支持"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${notoSerif.variable} font-sans min-h-screen antialiased`}>
        <div className="atmosphere" aria-hidden="true" />
        <div className="relative z-10">
          <CrisisBanner />
          <Navigation />
          <main className="pb-24 md:pb-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
