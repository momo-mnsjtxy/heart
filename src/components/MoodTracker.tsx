"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, TrendingUp, Sparkles } from "lucide-react";
import type { MoodEntry, PrivacySettings } from "@/types";
import { MOOD_LABELS, MOOD_EMOJIS, MOOD_COLORS, MOOD_TAGS } from "@/lib/counselor";
import { generateId, formatDateTime } from "@/lib/id";
import { saveMoodEntry, getAllMoodEntries, deleteMoodEntry, getPrivacySettings } from "@/lib/storage";

export default function MoodTracker() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<number>(3);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  useEffect(() => {
    loadEntries();
    loadPrivacySettings();
  }, []);

  async function loadEntries() {
    const all = await getAllMoodEntries();
    setEntries(all);
  }

  async function loadPrivacySettings() {
    const settings = await getPrivacySettings();
    setPrivacySettings(settings);
  }

  async function handleSave() {
    const entry: MoodEntry = {
      id: generateId(),
      mood: selectedMood,
      note: note.trim() || undefined,
      tags: selectedTags,
      timestamp: Date.now(),
    };

    // Respect privacy settings: only persist when "保存情绪数据" is enabled
    if (privacySettings?.saveMoodData !== false) {
      await saveMoodEntry(entry);
      await loadEntries();
    }

    setNote("");
    setSelectedTags([]);
    setSelectedMood(3);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteMoodEntry(id);
    await loadEntries();
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const recentEntries = entries.slice(0, 14).reverse();
  const avgMood = entries.length > 0
    ? (entries.reduce((sum, e) => sum + e.mood, 0) / entries.length).toFixed(1)
    : null;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = entries.filter((e) => e.timestamp >= weekAgo);
  const weekAvg =
    weekEntries.length > 0
      ? weekEntries.reduce((sum, e) => sum + e.mood, 0) / weekEntries.length
      : null;
  const tagCounts = weekEntries.reduce<Record<string, number>>((acc, e) => {
    e.tags.forEach((t) => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {});
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weekInsight =
    weekEntries.length === 0
      ? null
      : weekAvg !== null && weekAvg >= 4
        ? `近 7 天平均情绪偏积极（${weekAvg.toFixed(1)}），继续保持对自己的关照。`
        : weekAvg !== null && weekAvg <= 2.5
          ? `近 7 天情绪偏低（${weekAvg.toFixed(1)}）${topTag ? `，常出现「${topTag}」` : ""}。可以试试正念练习或写一篇日记。`
          : `近 7 天记录了 ${weekEntries.length} 次情绪${topTag ? `，最常提到「${topTag}」` : ""}。觉察本身就是很好的开始。`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">情绪记录</h1>
          <p className="text-gray-500 text-sm mt-1">
            {privacySettings?.saveMoodData === false
              ? "已关闭情绪数据保存，本次记录不会写入本地"
              : "追踪你的情绪变化，数据仅存储在本地"}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          记录情绪
        </button>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-indigo-600">{entries.length}</div>
            <div className="text-sm text-gray-500 mt-1">总记录数</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">{avgMood}</div>
            <div className="text-sm text-gray-500 mt-1">平均情绪</div>
          </div>
        </div>
      )}

      {weekInsight && (
        <div className="card bg-gradient-to-br from-indigo-50 to-sky-50 border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-gray-900 text-sm">本周洞察</h2>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{weekInsight}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/practice" className="text-xs text-indigo-600 hover:underline">
                  去做正念练习 →
                </Link>
                <Link href="/journal" className="text-xs text-indigo-600 hover:underline">
                  写情绪日记 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mood chart */}
      {recentEntries.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="font-medium text-gray-900">近期趋势</h2>
          </div>
          <div className="flex items-end gap-2 h-32">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${entry.mood * 20}%`,
                    backgroundColor: MOOD_COLORS[entry.mood - 1],
                    minHeight: "8px",
                  }}
                />
                <span className="text-xs">{MOOD_EMOJIS[entry.mood - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New entry form */}
      {showForm && (
        <div className="card animate-fade-in-up">
          <h2 className="font-medium text-gray-900 mb-4">此刻的感受</h2>

          <div className="flex justify-between gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                  selectedMood === mood
                    ? "bg-indigo-50 border-2 border-indigo-400 scale-105"
                    : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                }`}
              >
                <span className="text-2xl">{MOOD_EMOJIS[mood - 1]}</span>
                <span className="text-xs text-gray-600">{MOOD_LABELS[mood - 1]}</span>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-2 block">标签（可选）</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="写下此刻的想法...（可选）"
            className="input-field mb-4"
            rows={3}
          />

          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary flex-1">保存</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
          </div>
        </div>
      )}

      {/* Entry list */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="card flex items-start gap-4 animate-fade-in-up">
            <div className="text-3xl">{MOOD_EMOJIS[entry.mood - 1]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{MOOD_LABELS[entry.mood - 1]}</span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
              {entry.note && <p className="text-sm text-gray-600 mt-1">{entry.note}</p>}
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {entries.length === 0 && !showForm && (
          <div className="card text-center py-12">
            <p className="text-gray-400">还没有情绪记录</p>
            <p className="text-sm text-gray-400 mt-1">开始记录，了解自己的情绪模式</p>
          </div>
        )}
      </div>
    </div>
  );
}
