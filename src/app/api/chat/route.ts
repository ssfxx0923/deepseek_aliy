import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// 扩展类型声明以支持阿里云的API返回
interface DeepseekChatMessage extends OpenAI.Chat.Completions.ChatCompletionMessage {
  reasoning_content?: string;
}

// 配置 OpenAI 客户端连接阿里云 API
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// 检查是否启用流式响应
const enableStreaming = process.env.ENABLE_STREAMING === 'true';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "请提供有效的消息数组" },
        { status: 400 }
      );
    }

    // 如果启用了流式响应
    if (enableStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let accumulatedReasoning = "";
          let accumulatedContent = "";
          let currentSegment = {
            reasoning: "",
            content: "",
          };
          let currentLength = 0;
          const SEGMENT_SIZE = 1000; // 每个段的最大长度

          try {
            const completion = await openai.chat.completions.create({
              model: "deepseek-r1",
              messages,
              stream: true,
            });

            for await (const chunk of completion) {
              const reasoning = (chunk.choices[0].delta as any).reasoning_content;
              const content = chunk.choices[0].delta.content;

              // 立即处理并发送思考过程
              if (reasoning) {
                accumulatedReasoning += reasoning;
                const data = {
                  type: "reasoning",
                  content: reasoning,
                  fullContent: accumulatedReasoning,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                currentSegment.reasoning += reasoning;
              }

              // 立即处理并发送内容
              if (content) {
                accumulatedContent += content;
                const data = {
                  type: "content",
                  content: content,
                  fullContent: accumulatedContent,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                currentSegment.content += content;
              }

              // 累积长度计算
              currentLength += (reasoning?.length || 0) + (content?.length || 0);

              // 当累积的文本长度达到阈值时，重置段
              if (currentLength >= SEGMENT_SIZE) {
                currentSegment = {
                  reasoning: "",
                  content: "",
                };
                currentLength = 0;
              }

              // 如果流结束
              if (chunk.choices[0].finish_reason) {
                const data = {
                  type: "done",
                  reasoning_content: accumulatedReasoning,
                  content: accumulatedContent,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                controller.close();
              }
            }
          } catch (error: any) {
            const data = {
              type: "error",
              error: error.message || "处理请求时出错",
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            controller.close();
            console.error("流式 API 调用错误:", error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Transfer-Encoding': 'chunked'
        },
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: "deepseek-r1",
        messages,
      });

      const message = completion.choices[0].message as unknown as DeepseekChatMessage;

      return NextResponse.json({
        content: message.content,
        reasoning_content: message.reasoning_content,
      });
    }
  } catch (error: any) {
    console.error("API 调用错误:", error);
    return NextResponse.json(
      { error: error.message || "处理请求时出错" },
      { status: 500 }
    );
  }
} 