"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import {
  getEncryptionStatus,
  unlockEncryption,
  type EncryptionStatus,
} from "@/lib/storage";

interface EncryptionGateProps {
  /** Called after successful unlock so parents can reload data. */
  onUnlocked?: () => void;
  className?: string;
}

export default function EncryptionGate({ onUnlocked, className = "" }: EncryptionGateProps) {
  const [status, setStatus] = useState<EncryptionStatus>("off");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEncryptionStatus().then(setStatus).catch(() => setStatus("off"));
  }, []);

  async function handleUnlock() {
    if (!passphrase) {
      setError("请输入加密密码");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await unlockEncryption(passphrase);
      setPassphrase("");
      setStatus("unlocked");
      onUnlocked?.();
    } catch {
      setError("密码错误或密钥损坏");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "locked") return null;

  return (
    <div
      className={`rounded-xl border border-[var(--line)] bg-sand/50 px-4 py-3 space-y-3 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-soft flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-teal" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">本地数据已加密</p>
          <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
            刷新后需重新解锁才能查看或保存记录。也可前往{" "}
            <Link href="/privacy" className="text-teal hover:underline">
              隐私中心
            </Link>
            。
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUnlock();
          }}
          placeholder="输入加密密码"
          className="input-field flex-1"
          aria-label="加密密码"
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleUnlock}
          disabled={busy}
          className="btn-primary text-sm flex items-center justify-center gap-2 shrink-0"
        >
          <Unlock className="w-4 h-4" />
          {busy ? "解锁中…" : "解锁"}
        </button>
      </div>
      {error && <p className="text-xs text-crisis">{error}</p>}
    </div>
  );
}
