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
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-40 border-r border-[var(--line)] bg-white/55 backdrop-blur-xl">
        <div className="px-6 pt-8 pb-6">
          <Link href="/" className="block group">
            <span className="brand-mark text-3xl font-semibold text-ink tracking-[0.06em] group-hover:text-teal-deep transition-colors">
              心语
            </span>
            <p className="text-xs text-ink-soft mt-1.5 tracking-wide">隐私优先 · AI 咨询</p>
          </Link>
        </div>

        <div className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-teal-soft text-teal-deep font-medium"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="m-4 p-4 rounded-xl border border-[var(--line)] bg-gradient-to-br from-teal-soft/80 to-sand/40">
          <p className="text-xs font-medium text-teal-deep">本地加密 · 零追踪</p>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">数据只留在你的设备上</p>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-white/85 backdrop-blur-xl">
        <div className="flex justify-around py-2 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all min-w-0 ${
                  isActive ? "text-teal-deep" : "text-ink-soft"
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
