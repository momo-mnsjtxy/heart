"use client";

import { useState, useEffect } from "react";
import {
  Shield, Lock, Download, Trash2, Eye, EyeOff,
  CheckCircle, AlertTriangle, Database, Key,
} from "lucide-react";
import type { PrivacySettings } from "@/types";
import {
  getPrivacySettings, savePrivacySettings, exportAllData,
  deleteAllData, getStorageStats, setEncryptionPassphrase,
  clearEncryptionPassphrase, unlockEncryption, isEncryptionUnlocked,
} from "@/lib/storage";

export default function PrivacyDashboard() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [stats, setStats] = useState({
    sessions: 0,
    moods: 0,
    journals: 0,
    practices: 0,
    encrypted: false,
  });
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [s, st] = await Promise.all([getPrivacySettings(), getStorageStats()]);
    setSettings(s);
    setStats(st);
    setUnlocked(isEncryptionUnlocked());
  }

  async function updateSetting(key: keyof PrivacySettings, value: boolean) {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    await savePrivacySettings(updated);
    setSettings(updated);
    showMessage("设置已更新");
  }

  async function handleEnableEncryption() {
    if (passphrase.length < 8) {
      showMessage("密码至少需要 8 个字符");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      showMessage("两次输入的密码不一致");
      return;
    }
    try {
      await setEncryptionPassphrase(passphrase);
      setPassphrase("");
      setConfirmPassphrase("");
      await loadData();
      showMessage("加密已启用。密码不会被存储，请牢记您的密码");
    } catch {
      showMessage("启用加密失败，请重试");
    }
  }

  async function handleUnlock() {
    if (!unlockPassphrase) {
      showMessage("请输入加密密码");
      return;
    }
    try {
      await unlockEncryption(unlockPassphrase);
      setUnlockPassphrase("");
      setUnlocked(true);
      showMessage("已解锁，本页会话期间可读写加密数据");
    } catch {
      showMessage("密码错误或密钥损坏");
    }
  }

  async function handleDisableEncryption() {
    await clearEncryptionPassphrase();
    setUnlocked(false);
    await loadData();
    showMessage("加密已关闭");
  }

  async function handleExport() {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heart-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage("数据已导出");
    } catch {
      showMessage("导出失败：如已启用加密，请先解锁");
    }
  }

  async function handleDeleteAll() {
    await deleteAllData();
    setShowDeleteConfirm(false);
    setUnlocked(false);
    await loadData();
    showMessage("所有数据已永久删除");
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  if (!settings) return null;

  const privacyFeatures = [
    { icon: Database, title: "本地优先存储", desc: "所有数据存储在您的浏览器中，不上传至服务器" },
    { icon: Lock, title: "客户端加密", desc: "随机数据密钥经密码包裹后存储，密码本身永不落盘" },
    { icon: Eye, title: "零追踪", desc: "无 Cookie 追踪、无分析工具、无第三方数据共享" },
    { icon: Shield, title: "无痕模式", desc: "支持完全不保存对话的临时咨询模式" },
    { icon: Trash2, title: "完全控制", desc: "随时导出或永久删除您的所有数据" },
    { icon: Key, title: "无需注册", desc: "匿名使用，无需提供任何个人信息" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="page-title">隐私中心</h1>
        <p className="text-ink-soft text-sm mt-1">您的数据，您做主</p>
      </div>

      {message && (
        <div className="bg-teal-soft text-teal-deep px-4 py-3 rounded-xl border border-[var(--line)] flex items-center gap-2 animate-fade-in-up">
          <CheckCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {privacyFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="card flex gap-3">
              <div className="w-10 h-10 bg-teal-soft rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-teal" />
              </div>
              <div>
                <h3 className="font-medium text-ink text-sm">{feature.title}</h3>
                <p className="text-xs text-ink-soft mt-0.5">{feature.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="font-medium text-ink mb-4">本地数据统计</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-teal">{stats.sessions}</div>
            <div className="text-xs text-ink-soft">对话记录</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-teal-mid">{stats.moods}</div>
            <div className="text-xs text-ink-soft">情绪记录</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-teal">{stats.journals}</div>
            <div className="text-xs text-ink-soft">日记</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-teal-mid">{stats.practices}</div>
            <div className="text-xs text-ink-soft">练习</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--line)] text-center">
          <div className="text-sm font-medium text-teal">
            {stats.encrypted ? (unlocked ? "已解锁" : "已加密") : "未加密"}
          </div>
          <div className="text-xs text-ink-soft">加密状态</div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-ink">隐私设置</h2>

        {([
          { key: "saveConversations" as const, label: "保存对话记录", desc: "在本地存储咨询对话" },
          { key: "saveMoodData" as const, label: "保存情绪数据", desc: "在本地存储情绪记录" },
          { key: "saveJournalData" as const, label: "保存日记内容", desc: "在本地存储情绪日记" },
          { key: "ephemeralMode" as const, label: "默认无痕模式", desc: "新对话默认不保存" },
        ]).map((item) => (
          <label key={item.key} className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-ink">{item.label}</div>
              <div className="text-xs text-ink-soft">{item.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={settings[item.key]}
              onChange={(e) => updateSetting(item.key, e.target.checked)}
              className="rounded border-[var(--line)] text-teal focus:ring-teal/40 w-5 h-5"
            />
          </label>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-teal" />
          <h2 className="font-medium text-ink">数据加密</h2>
        </div>

        {settings.encryptionEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-mid text-sm">
              <CheckCircle className="w-4 h-4" />
              加密已启用 (AES-256-GCM · 密码不落盘)
            </div>
            <p className="text-xs text-ink-soft">
              仅存储经密码包裹的随机数据密钥；密码本身不会写入 IndexedDB。刷新页面后需重新解锁。
            </p>

            {!unlocked && (
              <div className="space-y-2 pt-1">
                <input
                  type="password"
                  value={unlockPassphrase}
                  onChange={(e) => setUnlockPassphrase(e.target.value)}
                  placeholder="输入密码以解锁本会话"
                  className="input-field"
                />
                <button onClick={handleUnlock} className="btn-primary text-sm">
                  解锁加密数据
                </button>
              </div>
            )}

            <button onClick={handleDisableEncryption} className="btn-danger text-sm">
              关闭加密
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              设置加密密码后，将生成随机数据密钥并用您的密码包裹后存储。密码不会上传，也不会以明文保存在本地。
            </p>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="设置加密密码（至少 8 位）"
                className="input-field pr-10"
              />
              <button
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/70"
                type="button"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="确认密码"
              className="input-field"
            />
            <button onClick={handleEnableEncryption} className="btn-primary text-sm">
              启用加密
            </button>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-ink">数据管理</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            导出所有数据
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            删除所有数据
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-bold">确认删除</h2>
            </div>
            <p className="text-ink-soft text-sm mb-6">
              此操作将永久删除所有本地存储的对话、情绪、日记、练习记录和设置。此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button onClick={handleDeleteAll} className="btn-danger flex-1">确认删除</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-sand/40 border-[var(--line)]">
        <h3 className="font-medium text-ink text-sm mb-2">重要声明</h3>
        <ul className="text-xs text-ink-soft space-y-1.5 leading-relaxed">
          <li>• 心语提供 AI 情感支持，不能替代专业心理咨询或治疗</li>
          <li>• 对话内容会发送至 AI 服务进行处理，但不会存储在服务器上</li>
          <li>• 如遇紧急心理危机，请立即拨打专业求助热线</li>
          <li>• 清除浏览器数据将导致所有本地记录丢失，请定期导出备份</li>
        </ul>
      </div>
    </div>
  );
}
