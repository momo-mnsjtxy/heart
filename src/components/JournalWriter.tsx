"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, BookOpen, Sparkles, Save, X } from "lucide-react";
import type { JournalEntry, PrivacySettings } from "@/types";
import { JOURNAL_PROMPTS } from "@/lib/practices";
import { MOOD_EMOJIS, MOOD_LABELS } from "@/lib/counselor";
import { generateId, formatDateTime } from "@/lib/id";
import {
  saveJournalEntry,
  getAllJournalEntries,
  deleteJournalEntry,
  getPrivacySettings,
  getEncryptionStatus,
} from "@/lib/storage";
import EncryptionGate from "@/components/EncryptionGate";

export default function JournalWriter() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [promptId, setPromptId] = useState<string | undefined>();
  const [mood, setMood] = useState<number | undefined>();
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const status = await getEncryptionStatus();
    if (status === "locked") {
      setEntries([]);
      setPrivacySettings(await getPrivacySettings());
      setMessage("日记已加密，请先解锁后查看");
      return;
    }
    try {
      const [all, settings] = await Promise.all([
        getAllJournalEntries(),
        getPrivacySettings(),
      ]);
      setEntries(all);
      setPrivacySettings(settings);
      setMessage("");
    } catch {
      setEntries([]);
      setPrivacySettings(null);
      setMessage("无法读取本地数据，请稍后重试或检查隐私中心加密状态");
    }
  }

  function startNew(prompt?: (typeof JOURNAL_PROMPTS)[number]) {
    setEditId(null);
    setPromptId(prompt?.id);
    setTitle(prompt?.title || "");
    setContent(prompt ? `${prompt.text}\n\n` : "");
    setMood(undefined);
    setEditing(true);
    setMessage("");
  }

  function startEdit(entry: JournalEntry) {
    setEditId(entry.id);
    setPromptId(entry.promptId);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setEditing(true);
    setMessage("");
  }

  function resetEditor() {
    setEditing(false);
    setTitle("");
    setContent("");
    setPromptId(undefined);
    setMood(undefined);
    setEditId(null);
  }

  async function handleSave() {
    if (!content.trim()) {
      setMessage("请先写下一些内容");
      return;
    }

    // Persistence disabled: keep draft visible so the user doesn't lose text
    if (privacySettings?.saveJournalData === false) {
      setMessage("已关闭日记保存，本次内容不会写入本地");
      return;
    }

    const now = Date.now();
    const entry: JournalEntry = {
      id: editId || generateId(),
      title: title.trim() || "无标题日记",
      content: content.trim(),
      promptId,
      mood,
      tags: [],
      createdAt: editId
        ? entries.find((e) => e.id === editId)?.createdAt || now
        : now,
      updatedAt: now,
    };

    try {
      await saveJournalEntry(entry);
      await load();
      setMessage("日记已保存到本地");
      resetEditor();
    } catch {
      setMessage("保存失败：如已启用加密，请先在隐私中心解锁");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteJournalEntry(id);
      await load();
    } catch {
      setMessage("删除失败：如已启用加密，请先在隐私中心解锁");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">情绪日记</h1>
          <p className="text-ink-soft text-sm mt-1">
            {privacySettings?.saveJournalData === false
              ? "已关闭日记保存，本次内容不会写入本地"
              : "私密书写空间，内容仅保存在你的设备上"}
          </p>
        </div>
        {!editing && (
          <button onClick={() => startNew()} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            写日记
          </button>
        )}
      </div>

      {message && (
        <div className="text-sm text-teal-deep bg-teal-soft/80 border border-[var(--line)] rounded-xl px-4 py-3 animate-fade-in-up">
          {message}
        </div>
      )}

      <EncryptionGate onUnlocked={load} />

      {!editing && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-teal" />
            <h2 className="font-medium text-ink">写作提示</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {JOURNAL_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => startNew(prompt)}
                className="text-left p-3 rounded-xl border border-[var(--line)] hover:border-teal/40 hover:bg-teal-soft transition-all"
              >
                <div className="text-sm font-medium text-ink">{prompt.title}</div>
                <p className="text-xs text-ink-soft mt-1 line-clamp-2">{prompt.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="card space-y-4 animate-fade-in-up">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选）"
            className="input-field font-medium"
          />

          <div>
            <label className="text-sm text-ink-soft mb-2 block">此刻心情（可选）</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? undefined : m)}
                  className={`flex-1 py-2 rounded-xl text-center transition-all ${
                    mood === m
                      ? "bg-teal-soft border-2 border-teal"
                      : "bg-white/45 border-2 border-transparent hover:bg-mist/60"
                  }`}
                  title={MOOD_LABELS[m - 1]}
                >
                  <span className="text-xl">{MOOD_EMOJIS[m - 1]}</span>
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在这里写下你的感受与想法……"
            className="input-field min-h-[220px] leading-relaxed"
            rows={10}
            autoFocus
          />

          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={() => {
                resetEditor();
                setMessage("");
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="card animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-soft flex items-center justify-center shrink-0">
                {entry.mood ? (
                  <span className="text-xl">{MOOD_EMOJIS[entry.mood - 1]}</span>
                ) : (
                  <BookOpen className="w-5 h-5 text-teal" />
                )}
              </div>
              <button className="flex-1 text-left min-w-0" onClick={() => startEdit(entry)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-ink">{entry.title}</h3>
                  <span className="text-xs text-ink-soft/70">
                    {formatDateTime(entry.updatedAt)}
                  </span>
                </div>
                <p className="text-sm text-ink-soft mt-1 line-clamp-3 whitespace-pre-wrap">
                  {entry.content}
                </p>
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-ink-soft/70 hover:text-red-500 transition-colors p-1"
                aria-label="删除日记"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {entries.length === 0 && !editing && (
          <div className="card text-center py-12">
            <BookOpen className="w-10 h-10 text-ink-soft/40 mx-auto mb-3" />
            <p className="text-ink-soft/70">还没有日记</p>
            <p className="text-sm text-ink-soft/70 mt-1">选择一个提示，或自由书写开始吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
