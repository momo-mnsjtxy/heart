import Link from "next/link";
import { ArrowRight, MessageCircle, Wind, BookOpen, Heart, Shield } from "lucide-react";

const journeys = [
  {
    href: "/chat",
    title: "倾诉",
    description: "与心语对话，在不被评判的空间里整理感受。",
    icon: MessageCircle,
  },
  {
    href: "/practice",
    title: "安住",
    description: "呼吸、接地与身体扫描，把注意力带回当下。",
    icon: Wind,
  },
  {
    href: "/journal",
    title: "书写",
    description: "用私密日记把情绪落成文字，慢慢看清自己。",
    icon: BookOpen,
  },
  {
    href: "/mood",
    title: "觉察",
    description: "记录情绪起伏，发现属于你的内在节奏。",
    icon: Heart,
  },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      {/* Hero — one composition */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(43,106,99,0.22),transparent_58%),linear-gradient(180deg,rgba(243,247,246,0.2)_0%,rgba(233,226,214,0.55)_100%)]" />
          <div className="absolute right-[-8%] top-[12%] w-[min(72vw,38rem)] aspect-square">
            <div className="relative w-full h-full">
              <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-teal-mid/40 via-teal/25 to-sand/50 blur-2xl" />
              <div className="absolute inset-[28%] rounded-full bg-gradient-to-tr from-teal-deep/30 to-transparent" />
              <div className="hero-ripples absolute inset-[12%]">
                <span />
                <span />
                <span />
              </div>
              <div className="absolute inset-[34%] rounded-full border border-teal/20 bg-white/20 backdrop-blur-[2px]" />
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-0">
          <p className="brand-mark animate-rise text-5xl sm:text-6xl md:text-7xl font-semibold text-ink tracking-[0.08em]">
            心语
          </p>

          <h1 className="animate-rise-delay-1 mt-6 text-2xl sm:text-3xl md:text-4xl font-medium text-ink/90 max-w-xl leading-snug">
            一个安静的空间，倾听你的心声
          </h1>

          <p className="animate-rise-delay-2 mt-5 text-base md:text-lg text-ink-soft max-w-md leading-relaxed">
            隐私优先的 AI 情感支持。对话、情绪与日记都留在你的设备上。
          </p>

          <div className="animate-rise-delay-3 mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/chat" className="btn-primary text-base px-8">
              开始咨询
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/practice" className="btn-secondary text-base px-8">
              正念练习
            </Link>
          </div>
        </div>
      </section>

      {/* Journeys — one job */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-xl mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            四种回到自己的方式
          </h2>
          <p className="page-subtitle mt-3 text-base">
            不必一次做完。选此刻最需要的那一条路。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-12">
          {journeys.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group block border-t border-[var(--line)] pt-6 transition-colors hover:border-teal/40"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-5 h-5 text-teal mt-1 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
                  <div>
                    <h3 className="font-display text-2xl font-medium text-ink group-hover:text-teal-deep transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                      {item.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-4 text-sm text-teal font-medium opacity-80 group-hover:opacity-100 group-hover:gap-2 transition-all">
                      进入 <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Privacy — one job */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-gradient-to-br from-teal-deep via-teal to-teal-mid text-white px-8 py-12 md:px-14 md:py-16">
          <div
            className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute -left-10 bottom-0 w-56 h-56 rounded-full bg-sand/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-5">
              <Shield className="w-4 h-4" />
              <span>隐私承诺</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              你的心事，只属于你
            </h2>
            <p className="mt-4 text-white/80 leading-relaxed max-w-lg">
              本地存储、可选端到端加密、无需注册。我们不为追踪而设计——你随时可以导出或彻底清空。
            </p>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 mt-8 bg-white text-teal-deep font-medium px-6 py-3 rounded-xl hover:bg-foam transition-colors"
            >
              打开隐私中心
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 md:px-10 pb-16 text-center text-xs text-ink-soft/80 space-y-1">
        <p>心语提供 AI 情感支持，不能替代专业心理咨询、诊断或治疗。</p>
        <p>如遇心理危机，请拨打全国心理援助热线：400-161-9995</p>
      </footer>
    </div>
  );
}
