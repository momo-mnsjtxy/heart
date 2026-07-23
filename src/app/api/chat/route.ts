import { NextRequest, NextResponse } from "next/server";
import { COUNSELOR_SYSTEM_PROMPT, detectCrisis, CRISIS_RESPONSE } from "@/lib/counselor";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage && detectCrisis(lastUserMessage.content)) {
      return NextResponse.json({
        message: { role: "assistant", content: CRISIS_RESPONSE },
        crisis: true,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";

    if (!apiKey) {
      const response = generateFallbackResponse(lastUserMessage?.content || "");
      return NextResponse.json({
        message: { role: "assistant", content: response },
        fallback: true,
      });
    }

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: COUNSELOR_SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const fallback = generateFallbackResponse(lastUserMessage?.content || "");
      return NextResponse.json({
        message: { role: "assistant", content: fallback },
        fallback: true,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "我在这里陪伴你。请告诉我更多。";

    return NextResponse.json({
      message: { role: "assistant", content },
    });
  } catch {
    return NextResponse.json(
      { error: "处理请求时出现问题，请稍后再试" },
      { status: 500 }
    );
  }
}

function generateFallbackResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("焦虑") || lower.includes("紧张") || lower.includes("担心")) {
    return `我理解焦虑的感觉会让人很不舒服。🌿

让我们试试一个简单的呼吸练习：
1. 慢慢吸气，数到 4
2. 屏住呼吸，数到 4
3. 慢慢呼气，数到 6
4. 重复 3-5 次

你能告诉我，是什么具体的事情让你感到焦虑吗？说出来有时候本身就是一种释放。`;
  }

  if (lower.includes("难过") || lower.includes("伤心") || lower.includes("悲伤") || lower.includes("哭")) {
    return `感到难过是完全正常的，你的感受是真实且值得被重视的。💙

悲伤不需要被"修复"或"赶走"，允许自己感受这些情绪是勇敢的表现。

我想问你：此刻，你最需要的是什么？是一个倾听者，一些安慰，还是一些实际的建议？

记住，你不必独自承受这一切。`;
  }

  if (lower.includes("压力") || lower.includes("累") || lower.includes("疲惫")) {
    return `听起来你承受了很多。压力和疲惫是身体在告诉你：需要休息和关爱自己了。🌸

一些小建议：
- 把任务分解成更小的步骤
- 给自己设定合理的边界
- 每天留出 10 分钟只做自己喜欢的事
- 保证基本的睡眠和饮食

你最近有好好照顾自己的基本需求吗？`;
  }

  if (lower.includes("孤独") || lower.includes("寂寞") || lower.includes("没人")) {
    return `孤独感是非常真实的痛苦，谢谢你愿意在这里分享。🤝

有时候，即使身边有人，我们仍然会感到孤独。这并不意味着你有什么问题。

一些想法：
- 主动联系一个你信任的人，哪怕只是发个简单的消息
- 参加兴趣小组或志愿活动
- 记住：寻求帮助是力量的表现，不是软弱

你愿意和我聊聊，是什么让你感到孤独吗？`;
  }

  if (lower.includes("谢谢") || lower.includes("感谢")) {
    return `不用谢，能陪伴你让我感到荣幸。🌟

记住，照顾自己的心理健康是一个持续的过程，你已经迈出了重要的一步。

如果任何时候你需要倾诉，我都在这里。你也可以在「情绪记录」中追踪自己的感受变化。

今天还有什么想聊的吗？`;
  }

  return `谢谢你愿意和我分享。我在这里，认真倾听你说的每一句话。🌿

每个人的经历都是独特的，没有一种"正确"的感受方式。你此刻的感受——无论是什么——都是值得被理解和尊重的。

能告诉我更多吗？比如：
- 这种感觉持续多久了？
- 什么事情让情况变好或变糟？
- 你现在最需要什么样的支持？

我会尽我所能陪伴你。`;
}
