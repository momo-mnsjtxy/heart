"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Shield, Trash2, Plus, MessageCircle, Wind, BookOpen } from "lucide-react";
import type { Message, ChatSession, PrivacySettings } from "@/types";
import { generateId } from "@/lib/id";
import { saveSession, getAllSessions, deleteSession, getPrivacySettings } from "@/lib/storage";

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    async function init() {
      const settings = await getPrivacySettings();
      setPrivacySettings(settings);
      setEphemeral(settings.ephemeralMode);
      const all = await getAllSessions();
      setSessions(all);
      if (all.length > 0) {
        setCurrentSession(all[0]);
      }
    }
    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, scrollToBottom]);

  async function loadSessions() {
    const all = await getAllSessions();
    setSessions(all);
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

    let session = currentSession;
    if (!session) {
      session = {
        id: generateId(),
        title: input.trim().slice(0, 30),
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
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMessage];
    const updatedSession = {
      ...session,
      title: session.messages.length === 0 ? input.trim().slice(0, 30) : session.title,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setCurrentSession(updatedSession);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.message?.content || "抱歉，我暂时无法回应。请稍后再试。",
        timestamp: Date.now(),
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: Date.now(),
      };

      setCurrentSession(finalSession);

      // Persist only when global "保存对话记录" is on and session is not ephemeral
      const shouldSaveConversations = privacySettings?.saveConversations !== false;
      const shouldPersistSession = shouldSaveConversations && !ephemeral;

      if (shouldPersistSession) {
        await saveSession(finalSession);
        await loadSessions();
      }
    } catch {
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "连接出现问题，请检查网络后重试。你的消息已保留。",
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
    await deleteSession(id);
    if (currentSession?.id === id) {
      setCurrentSession(null);
    }
    await loadSessions();
  }

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen">
      {/* Session sidebar */}
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 w-72 h-full bg-white/70 backdrop-blur-md border-r border-[var(--line)] transition-transform duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-[var(--line)]">
          <button onClick={createNewSession} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                currentSession?.id === session.id
                  ? "bg-teal-soft text-teal-deep"
                  : "hover:bg-white/45 text-ink-soft"
              }`}
            >
              <button
                className="flex-1 text-left text-sm truncate"
                onClick={() => {
                  setCurrentSession(session);
                  setShowSidebar(false);
                }}
              >
                <MessageCircle className="w-4 h-4 inline mr-2 opacity-50" />
                {session.title}
              </button>
              <button
                onClick={() => handleDeleteSession(session.id)}
                className="opacity-0 group-hover:opacity-100 text-ink-soft/70 hover:text-red-500 transition-all p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
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
            <Shield className="w-4 h-4" />
            无痕模式
          </label>
          <p className="text-xs text-ink-soft/70 mt-1">开启后对话不会保存</p>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 bg-black/20 z-20" onClick={() => setShowSidebar(false)} />
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-white/45 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden text-ink-soft hover:text-ink"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-medium text-ink">
                {currentSession?.title || "心语咨询"}
              </h2>
              <p className="text-xs text-ink-soft">
                {ephemeral || privacySettings?.saveConversations === false
                  ? "对话不会保存到本地"
                  : "对话加密存储在本地"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
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
                  <div className={`text-xs mt-1 ${message.role === "user" ? "text-teal-soft" : "text-ink-soft/70"}`}>
                    {new Date(message.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="chat-bubble-assistant flex items-center gap-1 py-4">
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
                <div className="typing-dot w-2 h-2 bg-teal-mid rounded-full" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
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
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
