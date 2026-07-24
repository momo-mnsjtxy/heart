"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Wind,
  Hand,
  Scan,
  Lightbulb,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import type { PracticeLog } from "@/types";
import {
  BREATHING_PATTERNS,
  BODY_SCAN_STEPS,
  COPING_TOOLS,
  GROUNDING_STEPS,
  type BreathingPattern,
  type CopingTool,
} from "@/lib/practices";
import { generateId, formatShortDateTime } from "@/lib/id";
import { savePracticeLog, getAllPracticeLogs } from "@/lib/storage";
import EncryptionGate from "@/components/EncryptionGate";

type Tab = "breathing" | "grounding" | "body-scan" | "coping";

const TABS: { id: Tab; label: string; icon: typeof Wind }[] = [
  { id: "breathing", label: "呼吸", icon: Wind },
  { id: "grounding", label: "接地", icon: Hand },
  { id: "body-scan", label: "身体扫描", icon: Scan },
  { id: "coping", label: "应对", icon: Lightbulb },
];

export default function PracticeStudio() {
  const [tab, setTab] = useState<Tab>("breathing");
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [saveHint, setSaveHint] = useState("");

  async function refreshLogs() {
    try {
      const all = await getAllPracticeLogs();
      setLogs(all);
      setSaveHint("");
    } catch {
      setLogs([]);
      setSaveHint("练习记录已加密或无法读取，请先在上方解锁");
    }
  }

  useEffect(() => {
    refreshLogs();
  }, []);

  async function recordLog(
    type: PracticeLog["type"],
    label: string,
    durationSec: number,
    note?: string
  ) {
    const log: PracticeLog = {
      id: generateId(),
      type,
      label,
      durationSec,
      completedAt: Date.now(),
      note,
    };
    try {
      await savePracticeLog(log);
      setLogs((prev) => [log, ...prev].slice(0, 20));
      setSaveHint("");
    } catch {
      setLogs((prev) => [log, ...prev].slice(0, 20));
      setSaveHint("本次练习未写入本地：如已启用加密，请先解锁");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">正念练习</h1>
          <p className="text-ink-soft text-sm mt-1">
            呼吸、接地与应对技巧——全部在本地完成，无需联网
          </p>
        </div>
        <Link
          href="/journal"
          className="btn-secondary flex items-center gap-2 text-sm shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          写日记
        </Link>
      </div>

      <EncryptionGate onUnlocked={refreshLogs} />
      {saveHint && (
        <p className="text-sm text-teal-deep bg-teal-soft/80 border border-[var(--line)] rounded-xl px-4 py-3">
          {saveHint}
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="练习类型">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-teal text-white shadow-sm"
                  : "bg-white/70 text-ink-soft border border-[var(--line)] hover:bg-white/45"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "breathing" && <BreathingPanel onComplete={recordLog} />}
      {tab === "grounding" && <GroundingPanel onComplete={recordLog} />}
      {tab === "body-scan" && <BodyScanPanel onComplete={recordLog} />}
      {tab === "coping" && <CopingPanel onComplete={recordLog} />}

      {logs.length > 0 && (
        <div className="card">
          <h2 className="font-medium text-ink mb-3">最近练习</h2>
          <ul className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between text-sm text-ink-soft py-2 border-b border-[var(--line)] last:border-0"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-mid" />
                  {log.label}
                </span>
                <span className="text-xs text-ink-soft/70">
                  {formatShortDateTime(log.completedAt)}
                  {log.durationSec > 0 ? ` · ${log.durationSec}s` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BreathingPanel({
  onComplete,
}: {
  onComplete: (type: PracticeLog["type"], label: string, durationSec: number) => void;
}) {
  const [pattern, setPattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "holdAfter">("inhale");
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_PATTERNS[0].inhale);
  const [cycle, setCycle] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);

  const phases = useCallback(
    (p: BreathingPattern) => {
      const list: { name: typeof phase; seconds: number; label: string }[] = [
        { name: "inhale", seconds: p.inhale, label: "吸气" },
        { name: "hold", seconds: p.hold, label: "屏息" },
        { name: "exhale", seconds: p.exhale, label: "呼气" },
      ];
      if (p.holdAfter) {
        list.push({ name: "holdAfter", seconds: p.holdAfter, label: "屏息" });
      }
      return list;
    },
    []
  );

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        const list = phases(pattern);
        const idx = list.findIndex((item) => item.name === phase);
        const nextIdx = idx + 1;
        if (nextIdx < list.length) {
          setPhase(list[nextIdx].name);
          return list[nextIdx].seconds;
        }
        // next cycle
        const nextCycle = cycle + 1;
        if (nextCycle >= pattern.cycles) {
          setRunning(false);
          setDone(true);
          const elapsed = startedAt.current
            ? Math.round((Date.now() - startedAt.current) / 1000)
            : pattern.cycles * list.reduce((a, b) => a + b.seconds, 0);
          onComplete("breathing", pattern.name, elapsed);
          return 0;
        }
        setCycle(nextCycle);
        setPhase("inhale");
        return pattern.inhale;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, phase, pattern, cycle, phases, onComplete]);

  function start() {
    setDone(false);
    setCycle(0);
    setPhase("inhale");
    setSecondsLeft(pattern.inhale);
    startedAt.current = Date.now();
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setCycle(0);
    setPhase("inhale");
    setSecondsLeft(pattern.inhale);
    startedAt.current = null;
  }

  function selectPattern(p: BreathingPattern) {
    setPattern(p);
    setRunning(false);
    setDone(false);
    setCycle(0);
    setPhase("inhale");
    setSecondsLeft(p.inhale);
  }

  const phaseLabel =
    phase === "inhale" ? "吸气" : phase === "exhale" ? "呼气" : "屏息";
  const scale =
    phase === "inhale" ? 1.35 : phase === "exhale" ? 0.85 : phase === "hold" ? 1.35 : 0.85;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {BREATHING_PATTERNS.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPattern(p)}
            className={`text-left p-4 rounded-2xl border transition-all ${
              pattern.id === p.id
                ? "border-teal bg-teal-soft shadow-sm"
                : "border-[var(--line)] bg-white/70 hover:border-teal/30"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} mb-3`} />
            <div className="font-medium text-ink text-sm">{p.name}</div>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">{p.description}</p>
          </button>
        ))}
      </div>

      <div className="card flex flex-col items-center py-10">
        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${pattern.color} opacity-20 transition-transform ease-in-out`}
            style={{
              transform: `scale(${running ? scale : 1})`,
              transitionDuration: `${secondsLeft || 1}s`,
            }}
          />
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br ${pattern.color} flex flex-col items-center justify-center text-white shadow-lg transition-transform ease-in-out`}
            style={{
              transform: `scale(${running ? scale : 1})`,
              transitionDuration: `${secondsLeft || 1}s`,
            }}
          >
            <span className="text-3xl font-bold">{running || done ? secondsLeft : "—"}</span>
            <span className="text-xs opacity-90 mt-1">
              {done ? "完成" : running ? phaseLabel : "准备"}
            </span>
          </div>
        </div>

        <p className="text-sm text-ink-soft mb-4">
          {done
            ? `太棒了，你完成了 ${pattern.cycles} 轮 ${pattern.name}`
            : `第 ${Math.min(cycle + 1, pattern.cycles)} / ${pattern.cycles} 轮`}
        </p>

        <div className="flex gap-3">
          {!running ? (
            <button onClick={start} className="btn-primary flex items-center gap-2">
              <Play className="w-4 h-4" />
              {done ? "再练一次" : "开始"}
            </button>
          ) : (
            <button onClick={() => setRunning(false)} className="btn-secondary flex items-center gap-2">
              <Pause className="w-4 h-4" />
              暂停
            </button>
          )}
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}

function GroundingPanel({
  onComplete,
}: {
  onComplete: (type: PracticeLog["type"], label: string, durationSec: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<boolean[][]>(
    GROUNDING_STEPS.map((s) => Array(s.count).fill(false))
  );
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
  }, []);

  const current = GROUNDING_STEPS[step];
  const stepDone = checked[step].every(Boolean);
  const allDone = checked.every((row) => row.every(Boolean));

  function toggle(i: number) {
    setChecked((prev) => {
      const next = prev.map((row) => [...row]);
      next[step][i] = !next[step][i];
      return next;
    });
  }

  function finish() {
    const elapsed = startedAt.current
      ? Math.round((Date.now() - startedAt.current) / 1000)
      : 0;
    onComplete("grounding", "5-4-3-2-1 接地练习", elapsed);
  }

  function reset() {
    setStep(0);
    setChecked(GROUNDING_STEPS.map((s) => Array(s.count).fill(false)));
    startedAt.current = Date.now();
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-medium text-ink">5-4-3-2-1 接地练习</h2>
        <p className="text-sm text-ink-soft mt-1">
          通过五感把注意力带回当下，适合焦虑或解离时使用。
        </p>
      </div>

      <div className="flex gap-2">
        {GROUNDING_STEPS.map((s, i) => (
          <div
            key={s.sense}
            className={`flex-1 h-1.5 rounded-full ${
              i < step ? "bg-teal-mid" : i === step ? "bg-teal" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {!allDone ? (
        <>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-teal mb-2">{current.count}</div>
            <p className="text-lg text-ink font-medium">{current.prompt}</p>
            <p className="text-sm text-ink-soft/70 mt-1">感官：{current.sense}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {checked[step].map((ok, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-12 h-12 rounded-xl border-2 font-medium transition-all ${
                  ok
                    ? "bg-teal-soft border-teal-mid text-teal-deep"
                    : "bg-white border-[var(--line)] text-ink-soft/70 hover:border-teal/40"
                }`}
              >
                {ok ? "✓" : i + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="btn-secondary flex-1 disabled:opacity-40"
            >
              上一步
            </button>
            <button
              type="button"
              disabled={!stepDone}
              onClick={() => {
                if (step >= GROUNDING_STEPS.length - 1) {
                  // Last step complete — checkboxes drive allDone; nudge final checks if needed
                  setChecked((prev) => {
                    const next = prev.map((row) => [...row]);
                    next[step] = next[step].map(() => true);
                    return next;
                  });
                  return;
                }
                setStep((s) => Math.min(GROUNDING_STEPS.length - 1, s + 1));
              }}
              className="btn-primary flex-1 flex items-center justify-center gap-1 disabled:opacity-40"
            >
              {step >= GROUNDING_STEPS.length - 1 ? (
                "完成"
              ) : (
                <>
                  下一步 <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-teal-mid mx-auto" />
          <p className="text-ink font-medium">你已回到当下</p>
          <p className="text-sm text-ink-soft">慢慢感受双脚与地面的接触，继续一次深呼吸。</p>
          <div className="flex gap-3 justify-center">
            <button onClick={finish} className="btn-primary">
              记录完成
            </button>
            <button onClick={reset} className="btn-secondary">
              再练一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BodyScanPanel({
  onComplete,
}: {
  onComplete: (type: PracticeLog["type"], label: string, durationSec: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);
  const pausedAccumMs = useRef(0);
  const pauseStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running || paused) return;
    if (step >= BODY_SCAN_STEPS.length) {
      setRunning(false);
      setPaused(false);
      setDone(true);
      const elapsed = startedAt.current
        ? Math.round((Date.now() - startedAt.current - pausedAccumMs.current) / 1000)
        : BODY_SCAN_STEPS.length * 12;
      onComplete("body-scan", "身体扫描", Math.max(elapsed, 1));
      return;
    }
    const timer = setTimeout(() => setStep((s) => s + 1), 12000);
    return () => clearTimeout(timer);
  }, [running, paused, step, onComplete]);

  function start() {
    setDone(false);
    setStep(0);
    setPaused(false);
    pausedAccumMs.current = 0;
    pauseStartedAt.current = null;
    startedAt.current = Date.now();
    setRunning(true);
  }

  function pause() {
    pauseStartedAt.current = Date.now();
    setPaused(true);
    setRunning(false);
  }

  function resume() {
    if (pauseStartedAt.current) {
      pausedAccumMs.current += Date.now() - pauseStartedAt.current;
      pauseStartedAt.current = null;
    }
    setPaused(false);
    setRunning(true);
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-medium text-ink">引导式身体扫描</h2>
        <p className="text-sm text-ink-soft mt-1">
          约 {BODY_SCAN_STEPS.length * 12} 秒，逐步觉察身体各部位的感受。
        </p>
      </div>

      <div className="min-h-[140px] flex items-center justify-center text-center px-4">
        {done ? (
          <div>
            <CheckCircle2 className="w-10 h-10 text-teal-mid mx-auto mb-3" />
            <p className="text-ink font-medium">身体扫描完成</p>
            <p className="text-sm text-ink-soft mt-1">感谢你给自己这段安静的时间。</p>
          </div>
        ) : (
          <p
            key={step}
            className="text-lg text-ink leading-relaxed animate-fade-in-up"
          >
            {paused
              ? "已暂停。准备好后继续。"
              : running
                ? BODY_SCAN_STEPS[Math.min(step, BODY_SCAN_STEPS.length - 1)]
                : "找一个舒适的姿势，准备开始。"}
          </p>
        )}
      </div>

      {(running || paused) && !done && (
        <div className="w-full bg-mist/60 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-teal transition-all duration-500"
            style={{ width: `${((step + 1) / BODY_SCAN_STEPS.length) * 100}%` }}
          />
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {done ? (
          <button type="button" onClick={start} className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            再练一次
          </button>
        ) : paused ? (
          <button type="button" onClick={resume} className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            继续
          </button>
        ) : running ? (
          <button type="button" onClick={pause} className="btn-secondary flex items-center gap-2">
            <Pause className="w-4 h-4" />
            暂停
          </button>
        ) : (
          <button type="button" onClick={start} className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            开始扫描
          </button>
        )}
      </div>
    </div>
  );
}

function CopingPanel({
  onComplete,
}: {
  onComplete: (
    type: PracticeLog["type"],
    label: string,
    durationSec: number,
    note?: string
  ) => void;
}) {
  const [selected, setSelected] = useState<CopingTool | null>(null);
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState<string>("全部");
  const startedAt = useRef<number | null>(null);

  const categories = ["全部", "焦虑", "低落", "愤怒", "压力"];
  const tools =
    filter === "全部" ? COPING_TOOLS : COPING_TOOLS.filter((t) => t.category === filter);

  function openTool(tool: CopingTool) {
    setSelected(tool);
    setStep(0);
    startedAt.current = Date.now();
  }

  function complete() {
    if (!selected) return;
    const elapsed = startedAt.current
      ? Math.round((Date.now() - startedAt.current) / 1000)
      : 0;
    onComplete("cbt", selected.title, elapsed);
    setSelected(null);
  }

  if (selected) {
    return (
      <div className="card space-y-5 animate-fade-in-up">
        <div>
          <p className="text-xs text-teal font-medium mb-1">{selected.category}</p>
          <h2 className="font-medium text-ink text-lg">{selected.title}</h2>
          <p className="text-sm text-ink-soft mt-1">{selected.summary}</p>
        </div>

        <div className="bg-teal-soft rounded-xl p-5">
          <p className="text-xs text-teal-mid mb-2">
            步骤 {step + 1} / {selected.steps.length}
          </p>
          <p className="text-ink leading-relaxed">{selected.steps[step]}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setSelected(null)} className="btn-secondary">
            返回
          </button>
          {step < selected.steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary flex-1 flex items-center justify-center gap-1"
            >
              下一步 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={complete} className="btn-primary flex-1">
              完成练习
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === c
                ? "bg-teal-soft text-teal-deep border border-teal/40"
                : "bg-white text-ink-soft border border-[var(--line)] hover:bg-white/45"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => openTool(tool)}
            className="card text-left hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-teal font-medium">{tool.category}</span>
                <h3 className="font-medium text-ink mt-1">{tool.title}</h3>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">{tool.summary}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-soft/40 group-hover:text-teal-mid mt-1 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
