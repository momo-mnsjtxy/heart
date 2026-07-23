import Link from "next/link";
import { MessageCircle, Heart, Shield, Lock, Sparkles, ArrowRight } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "AI 情感支持",
    description: "温暖、专业的 AI 咨询助手，随时倾听你的感受，提供情绪引导和支持。",
    href: "/chat",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: Heart,
    title: "情绪追踪",
    description: "记录每日情绪变化，发现情绪模式，更好地了解自己。",
    href: "/mood",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Shield,
    title: "隐私至上",
    description: "数据加密存储在本地，无需注册，零追踪，你完全掌控自己的数据。",
    href: "/privacy",
    color: "from-green-500 to-emerald-600",
  },
];

const privacyPoints = [
  "所有数据存储在您的设备本地",
  "可选 AES-256-GCM 端到端加密",
  "无需注册，完全匿名使用",
  "无 Cookie 追踪，无第三方分析",
  "支持无痕模式，对话不留痕迹",
  "随时导出或永久删除所有数据",
];

export default function HomePage() {
  return (
    <div className="md:ml-64">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-transparent to-purple-100/50" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            隐私优先 · 本地存储 · 端到端加密
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            一个安全的空间
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              倾听你的心声
            </span>
          </h1>

          <p className="text-lg text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            心语是一个隐私优先的 AI 心理健康支持平台。
            在这里，你可以自由表达感受，获得温暖的陪伴和专业引导——
            所有数据都安全地存储在你的设备上。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/chat" className="btn-primary flex items-center justify-center gap-2 text-base">
              <Sparkles className="w-5 h-5" />
              开始咨询
            </Link>
            <Link href="/privacy" className="btn-secondary flex items-center justify-center gap-2 text-base">
              <Shield className="w-5 h-5" />
              了解隐私保护
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href} className="card group hover:shadow-md transition-all duration-300">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                  了解更多 <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Privacy section */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                你的隐私，我们的首要承诺
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                心理健康数据极其敏感。我们采用隐私优先架构，
                确保你的每一次倾诉都安全无忧。
              </p>
              <ul className="space-y-3">
                {privacyPoints.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-3 h-3 text-green-600" />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full md:w-64 h-64 bg-white/60 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">AES-256-GCM</p>
                <p className="text-xs text-gray-500 mt-1">军事级加密标准</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>心语提供 AI 情感支持，不能替代专业心理咨询、诊断或治疗。</p>
          <p>如遇心理危机，请拨打全国心理援助热线：400-161-9995</p>
        </div>
      </section>
    </div>
  );
}
