import { NextRequest, NextResponse } from "next/server";
import { COUNSELOR_SYSTEM_PROMPT, detectCrisis, CRISIS_RESPONSE } from "@/lib/counselor";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 4000;

const CONFIG_REQUIRED_MESSAGE = `当前还没有配置 AI 模型接口，因此无法生成真实咨询回复。

请在项目根目录创建 \`.env.local\`，填入：

\`\`\`
OPENAI_API_KEY=你的密钥
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
\`\`\`

也可以把 \`OPENAI_API_BASE\` 改成兼容 OpenAI 协议的其他服务地址。配置后重启开发服务器即可。

在此之前，你仍可使用情绪记录、正念练习、日记与隐私功能；如遇危机请拨打 400-161-9995。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = (body as { messages?: ChatMessage[]; stream?: boolean }).messages;
    const wantStream = (body as { stream?: boolean }).stream !== false;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `消息条数过多（最多 ${MAX_MESSAGES} 条）` },
        { status: 400 }
      );
    }

    for (const message of messages) {
      if (!message || (message.role !== "user" && message.role !== "assistant")) {
        return NextResponse.json({ error: "消息格式无效" }, { status: 400 });
      }
      if (typeof message.content !== "string" || !message.content.trim()) {
        return NextResponse.json({ error: "消息内容无效" }, { status: 400 });
      }
      if (message.content.length > MAX_CONTENT_LENGTH) {
        return NextResponse.json(
          { error: `单条消息过长（最多 ${MAX_CONTENT_LENGTH} 字）` },
          { status: 400 }
        );
      }
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage && detectCrisis(lastUserMessage.content)) {
      return NextResponse.json({
        message: { role: "assistant", content: CRISIS_RESPONSE },
        crisis: true,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const apiBase = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "未配置 OPENAI_API_KEY",
          message: { role: "assistant", content: CONFIG_REQUIRED_MESSAGE },
          configured: false,
        },
        { status: 503 }
      );
    }

    const upstreamBody = {
      model,
      messages: [
        { role: "system", content: COUNSELOR_SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: wantStream,
    };

    const upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Upstream AI error:", upstream.status, detail.slice(0, 500));
      return NextResponse.json(
        {
          error: "AI 服务暂时不可用",
          message: {
            role: "assistant",
            content:
              "抱歉，AI 模型暂时无法回应（上游服务报错）。请稍后再试，或检查 API Key / 接口地址是否正确。你的消息仍保留在本地。",
          },
          upstreamStatus: upstream.status,
        },
        { status: 502 }
      );
    }

    if (wantStream && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = upstream.body!.getReader();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const data = trimmed.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                    );
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "流式传输中断" })}\n\n`
              )
            );
            console.error("Stream relay error:", err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    const content =
      data.choices?.[0]?.message?.content || "我在这里陪伴你。请告诉我更多。";

    return NextResponse.json({
      message: { role: "assistant", content },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "处理请求时出现问题，请稍后再试" },
      { status: 500 }
    );
  }
}
