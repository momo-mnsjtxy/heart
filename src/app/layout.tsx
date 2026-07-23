import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import CrisisBanner from "@/components/CrisisBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "心语 - 隐私优先的 AI 心理咨询",
  description: "安全、私密、温暖的 AI 心理健康支持平台。所有数据加密存储在您的设备上，我们绝不收集您的对话内容。",
  keywords: ["心理咨询", "AI", "隐私", "心理健康", "情绪支持"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen`}>
        <CrisisBanner />
        <Navigation />
        <main className="pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
