"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Heart, Shield, Home, Wind, BookOpen } from "lucide-react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/chat", label: "咨询", icon: MessageCircle },
  { href: "/mood", label: "情绪", icon: Heart },
  { href: "/practice", label: "练习", icon: Wind },
  { href: "/journal", label: "日记", icon: BookOpen },
  { href: "/privacy", label: "隐私", icon: Shield },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-white/70 backdrop-blur-md border-r border-white/50 z-40">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">心语</h1>
              <p className="text-xs text-gray-500">隐私优先 · AI 咨询</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 m-4 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs text-green-700 font-medium">🔒 端到端隐私保护</p>
          <p className="text-xs text-green-600 mt-1">数据仅存储在您的设备上</p>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-40">
        <div className="flex justify-around py-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all min-w-0 ${
                  isActive ? "text-indigo-600" : "text-gray-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
