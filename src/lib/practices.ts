export type BreathingPattern = {
  id: string;
  name: string;
  description: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfter?: number;
  cycles: number;
  color: string;
};

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: "box",
    name: "盒式呼吸",
    description: "均匀的四拍呼吸，帮助稳定情绪、降低焦虑。",
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfter: 4,
    cycles: 4,
    color: "from-teal-mid to-teal-deep",
  },
  {
    id: "478",
    name: "4-7-8 放松法",
    description: "延长呼气，激活副交感神经，适合睡前放松。",
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
    color: "from-sand-deep to-teal",
  },
  {
    id: "calm",
    name: "平静呼吸",
    description: "温和的深呼吸节奏，适合日常情绪调节。",
    inhale: 4,
    hold: 2,
    exhale: 6,
    cycles: 6,
    color: "from-teal to-teal-mid",
  },
];

export const GROUNDING_STEPS = [
  { sense: "看见", count: 5, prompt: "说出你能看到的 5 样东西" },
  { sense: "触碰", count: 4, prompt: "说出你能触碰到的 4 样东西" },
  { sense: "听见", count: 3, prompt: "说出你能听到的 3 种声音" },
  { sense: "闻到", count: 2, prompt: "说出你能闻到的 2 种气味" },
  { sense: "尝到", count: 1, prompt: "说出你能尝到的 1 种味道" },
];

export const BODY_SCAN_STEPS = [
  "轻轻闭上眼睛或放软目光，注意自己的呼吸。",
  "把注意力带到头顶和额头，感受有无紧绷。",
  "感受眼部、脸颊和下颌，允许它们放松。",
  "留意肩膀和手臂的重量，慢慢放下紧绷。",
  "感受胸口的起伏，跟随每一次呼吸。",
  "注意腹部，让呼吸自然深入。",
  "感受大腿、小腿和脚底与地面的接触。",
  "用一次深呼吸把觉察带回整个身体。",
];

export type CopingTool = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  category: "焦虑" | "低落" | "愤怒" | "压力";
};

export const COPING_TOOLS: CopingTool[] = [
  {
    id: "thought-reframe",
    title: "认知重构",
    summary: "识别自动化负面想法，寻找更平衡的视角。",
    category: "焦虑",
    steps: [
      "写下此刻出现的想法（尽量原话）。",
      "问自己：有哪些证据支持这个想法？有哪些反对？",
      "如果朋友遇到同样情况，你会怎么安慰对方？",
      "用更平衡、更友善的句子重新表述这个想法。",
    ],
  },
  {
    id: "worry-park",
    title: "担忧停车位",
    summary: "把担忧暂时「停放」，避免反复纠缠。",
    category: "焦虑",
    steps: [
      "准备一张纸或打开日记，写下当前担忧。",
      "给每个担忧标注：现在能解决 / 以后再处理。",
      "对「以后再处理」的担忧，约定一个专门时间再看。",
      "回到当下，做 3 次缓慢深呼吸。",
    ],
  },
  {
    id: "tiny-joy",
    title: "微小愉悦",
    summary: "用很小的行动积累正向情绪能量。",
    category: "低落",
    steps: [
      "列出 3 件今天能在 10 分钟内完成的小事。",
      "选择一件最容易开始的，立刻去做。",
      "完成后在心里或纸上记下「我做到了」。",
      "如果愿意，再选一件，不必强迫自己一次做完。",
    ],
  },
  {
    id: "anger-pause",
    title: "愤怒暂停键",
    summary: "在情绪高峰时创造缓冲，避免冲动反应。",
    category: "愤怒",
    steps: [
      "先离开刺激源 5–10 分钟（如果安全可行）。",
      "用盒式呼吸做 2 轮，或在原地缓慢走动。",
      "问自己：我真正需要的是什么？（被听见、公平、休息…）",
      "再用「我感到…因为…我希望…」的句式表达需求。",
    ],
  },
  {
    id: "priority-triage",
    title: "压力分拣",
    summary: "把任务按紧急与重要分类，降低失控感。",
    category: "压力",
    steps: [
      "列出当前所有待办和压力来源。",
      "标出：紧急且重要 / 重要不紧急 / 可委托 / 可暂缓。",
      "只挑出今天必须完成的 1–3 项。",
      "完成后给自己一个短暂休息奖励。",
    ],
  },
  {
    id: "self-compassion",
    title: "自我慈悲",
    summary: "用对待好友的方式对待自己。",
    category: "低落",
    steps: [
      "承认：此刻很难，这是人类共同的体验。",
      "把手放在胸口，感受呼吸。",
      "对自己说一句温暖的话，例如「我已经在努力了」。",
      "选择一件小事照顾自己（喝水、伸展、短暂散步）。",
    ],
  },
];

export const JOURNAL_PROMPTS = [
  { id: "gratitude", title: "今日感恩", text: "今天有哪三件小事让你感到一点温暖或感恩？" },
  { id: "feelings", title: "情绪命名", text: "此刻你的主要情绪是什么？它像什么颜色或天气？" },
  { id: "challenge", title: "今日挑战", text: "今天最难的部分是什么？你是怎么应对的？" },
  { id: "body", title: "身体信号", text: "身体哪里感到紧绷或放松？它在告诉你什么？" },
  { id: "boundary", title: "边界练习", text: "今天有没有需要说「不」或请求帮助的时刻？" },
  { id: "future-self", title: "给未来的自己", text: "写一段话给一周后的自己，你会想提醒对方什么？" },
  { id: "free", title: "自由书写", text: "不设主题，连续写 5–10 分钟，想到什么写什么。" },
];
