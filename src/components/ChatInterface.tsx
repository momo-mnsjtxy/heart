"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Shield, Trash2, Plus, MessageCircle, Wind, BookOpen } from "lucide-react";
import type { Message, ChatSession, PrivacySettings } from "@/types";
import { generateId } from "@/lib/id";
import { detectCrisis } from "@/lib/counselor";
import {
  saveSession,
  getAllSessions,
  deleteSession,
  getPrivacySettings,
  getEncryptionStatus,
} from "@/lib/storage";
import { openCrisisResources } from "@/components/CrisisBanner";
import EncryptionGate from "@/components/EncryptionGate";

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [encryptionLocked, setEncryptionLocked] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const refreshEncryption = useCallback(async () => {
    const status = await getEncryptionStatus();
    setEncryptionLocked(status === "locked");
    return status;
  }, []);

  const loadSessions = useCallback(async () => {
    const status = await refreshEncryption();
    if (status === "locked") {
      setSessions([]);
      return;
    }
    const all = await getAllSessions();
    setSessions(all);
  }, [refreshEncryption]);

  useEffect(() => {
    async function init() {
      const settings = await getPrivacySettings();
      setPrivacySettings(settings);
      setEphemeral(settings.ephemeralMode);
      const status = await refreshEncryption();
      if (status === "locked") {
        setSessions([]);
        setStatusMessage("本地对话已加密，请先解锁后查看历史");
        return;
      }
      const all = await getAllSessions();
      setSessions(all);
      if (all.length > 0) {
        setCurrentSession(all[0]);
      }
    }
    init();
  }, [refreshEncryption]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, scrollToBottom]);

  async function handleUnlocked() {
    setStatusMessage("");
    await loadSessions();
    const all = await getAllSessions();
    if (all.length > 0 && !currentSession) {
      setCurrentSession(all[0]);
    }
  }

  function createNewSession() {
    const session: ChatSession = {
      id: generateId(),
      title: "新对话",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ephemeral,
    };
    setCurrentSession(session);
    setShowSidebar(false);
    inputRef.current?.focus();
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    if (detectCrisis(text)) {
      openCrisisResources();
    }

    let session = currentSession;
    if (!session) {
      session = {
        id: generateId(),
        title: text.slice(0, 30),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ephemeral,
      };
      setCurrentSession(session);
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMessage];
    const updatedSession = {
      ...session,
      title: session.messages.length === 0 ? text.slice(0, 30) : session.title,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setCurrentSession(updatedSession);
    setInput("");
    setIsLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      // Crisis / config / error responses are JSON (including some non-OK statuses with helpful copy)
      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.crisis) {
          openCrisisResources();
          setAiConfigured(true);
        } else if (data.configured === false || response.status === 503) {
          setAiConfigured(false);
          setStatusMessage("尚未配置 AI 模型密钥，请在 .env.local 中设置 OPENAI_API_KEY");
        } else if (!response.ok) {
          setStatusMessage(data.error || "AI 服务暂时不可用");
        } else {
          setAiConfigured(true);
        }

        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content:
            data.message?.content ||
            data.error ||
            "抱歉，我暂时无法回应。请稍后再试。",
          timestamp: Date.now(),
        };

        const finalSession = {
          ...updatedSession,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: Date.now(),
        };
        setCurrentSession(finalSession);

        const shouldSaveConversations = privacySettings?.saveConversations !== false;
        const shouldPersistSession = shouldSaveConversations && !ephemeral;
        if (shouldPersistSession && response.ok) {
          try {
            await saveSession(finalSession);
            await loadSessions();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "保存失败";
            setStatusMessage(msg.includes("解锁") ? msg : "对话保存失败，请检查隐私中心加密状态");
          }
        }
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("AI 服务暂时不可用");
      }

      // Real model: stream tokens into the bubble
      setAiConfigured(true);
      const assistantId = generateId();
      let assistantContent = "";

      setCurrentSession({
        ...updatedSession,
        messages: [
          ...updatedMessages,
          { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
        ],
        updatedAt: Date.now(),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              setCurrentSession((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  ),
                  updatedAt: Date.now(),
                };
              });
            }
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }

      if (!assistantContent.trim()) {
        assistantContent = "抱歉，模型没有返回内容。请稍后再试。";
        setCurrentSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            ),
          };
        });
      }

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [
          ...updatedMessages,
          {
            id: assistantId,
            role: "assistant",
            content: assistantContent,
            timestamp: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      };
      setCurrentSession(finalSession);

      const shouldSaveConversations = privacySettings?.saveConversations !== false;
      const shouldPersistSession = shouldSaveConversations && !ephemeral;
      if (shouldPersistSession) {
        try {
          await saveSession(finalSession);
          await loadSessions();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "保存失败";
          setStatusMessage(msg.includes("解锁") ? msg : "对话保存失败，请检查隐私中心加密状态");
        }
      }
    } catch {
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "连接出现问题，请检查网络或 AI 接口配置后重试。你的消息已保留。",
        timestamp: Date.now(),
      };
      setCurrentSession({
        ...updatedSession,
        messages: [...updatedMessages, errorMessage],
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteSession(id);
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
      await loadSessions();
    } catch {
      setStatusMessage("删除失败：如已启用加密，请先解锁");
    }
  }

  return (
    <div className="flex h-[calc(100dvh-6rem)] md:h-screen">
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 w-72 h-full bg-white/70 backdrop-blur-md border-r border-[var(--line)] transition-transform duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-[var(--line)]">
          <button
            type="button"
            onClick={createNewSession}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {encryptionLocked && (
            <p className="text-center text-ink-soft/70 text-sm py-6 px-2">
              历史对话已加密，解锁后显示
            </p>
          )}
          {!encryptionLocked &&
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                  currentSession?.id === session.id
                    ? "bg-teal-soft text-teal-deep"
                    : "hover:bg-white/45 text-ink-soft"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm truncate"
                  onClick={() => {
                    setCurrentSession(session);
                    setShowSidebar(false);
                  }}
                >
                  <MessageCircle className="w-4 h-4 inline mr-2 opacity-50" aria-hidden="true" />
                  {session.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(session.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-ink-soft/70 hover:text-red-500 transition-all p-1"
                  aria-label={`删除对话：${session.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          {!encryptionLocked && sessions.length === 0 && (
            <p className="text-center text-ink-soft/70 text-sm py-8">暂无历史对话</p>
          )}
        </div>

        <div className="p-4 border-t border-[var(--line)]">
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              checked={ephemeral}
              onChange={(e) => setEphemeral(e.target.checked)}
              className="rounded border-[var(--line)] text-teal focus:ring-teal/40"
            />
            <Shield className="w-4 h-4" aria-hidden="true" />
            无痕模式
          </label>
          <p className="text-xs text-ink-soft/70 mt-1">开启后对话不会保存</p>
        </div>
      </div>

      {showSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-20"
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-white/45 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="md:hidden text-ink-soft hover:text-ink"
              aria-label="打开对话列表"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-medium text-ink">{currentSession?.title || "心语咨询"}</h2>
              <p className="text-xs text-ink-soft">
                {ephemeral || privacySettings?.saveConversations === false
                  ? "对话不会保存到本地"
                  : "对话加密存储在本地"}
              </p>
            </div>
          </div>
        </div>

        {(encryptionLocked || statusMessage || aiConfigured === false) && (
          <div className="px-4 pt-3 space-y-2">
            <EncryptionGate onUnlocked={handleUnlocked} />
            {statusMessage && (
              <p className="text-xs text-teal-deep bg-teal-soft/80 border border-[var(--line)] rounded-xl px-3 py-2">
                {statusMessage}
              </p>
            )}
            {aiConfigured === false && !statusMessage && (
              <p className="text-xs text-ink-soft bg-sand/50 border border-[var(--line)] rounded-xl px-3 py-2">
                尚未配置 AI 模型：请在 `.env.local` 设置 `OPENAI_API_KEY` 后重启服务
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in-up">
              <p className="brand-mark text-4xl font-semibold text-ink tracking-[0.06em] mb-3">心语</p>
              <h3 className="font-display text-xl font-medium text-ink mb-2">你好，这里是安全的</h3>
              <p className="text-ink-soft text-sm max-w-md mb-8 leading-relaxed">
                一个私密的空间，你可以自由表达感受。我不会评判你，只会陪伴和倾听。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  "最近感到有些焦虑，想聊聊",
                  "工作压力很大，不知道怎么办",
                  "感觉有些孤独",
                  "想了解一些放松的方法",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-sm p-3.5 rounded-xl border border-[var(--line)] bg-white/60 hover:border-teal/40 hover:bg-teal-soft/60 transition-all text-ink-soft"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 text-sm text-teal-deep hover:text-teal bg-teal-soft/80 px-3.5 py-2 rounded-xl transition-colors"
                >
                  <Wind className="w-4 h-4" />
                  先做个呼吸练习
                </Link>
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink bg-sand/50 px-3.5 py-2 rounded-xl transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  写一篇情绪日记
                </Link>
              </div>
            </div>
          ) : (
            currentSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                <div className={message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === "user" ? "text-teal-soft" : "text-ink-soft/70"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && currentSession?.messages.at(-1)?.role !== "assistant" && (
            <div className="flex justify-start" aria-live="polite" aria-label="正在回复">
              <div className="chat-bubble-assistant flex items-center gap-1 py-4">
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[var(--line)] bg-white/45 backdrop-blur-sm">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说出你的感受..."
              rows={1}
              className="input-field resize-none flex-1 max-h-32"
              disabled={isLoading}
              aria-label="消息输入"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="发送消息"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-ink-soft/70 text-center mt-2">
            心语提供情感支持，不能替代专业心理咨询。如遇危机请拨打求助热线。
          </p>
        </div>
      </div>
    </div>
  );
}
