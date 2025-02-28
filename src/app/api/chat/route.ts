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

// 存储未完成的响应
const responseStore = new Map<string, {
  messages: any[];
  accumulatedReasoning: string;
  accumulatedContent: string;
  isComplete: boolean;
  lastUpdate: number;
}>();

// 清理过期的响应数据
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of responseStore.entries()) {
    if (now - value.lastUpdate > 5 * 60 * 1000) { // 5分钟过期
      responseStore.delete(key);
    }
  }
}, 60 * 1000); // 每分钟检查一次

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, continuationToken } = body;

    // 如果有 continuationToken，说明是继续之前的响应
    if (continuationToken && responseStore.has(continuationToken)) {
      const storedResponse = responseStore.get(continuationToken)!;
      
      // 如果响应已完成，返回完整内容
      if (storedResponse.isComplete) {
        responseStore.delete(continuationToken);
        return NextResponse.json({
          type: "done",
          reasoning_content: storedResponse.accumulatedReasoning,
          content: storedResponse.accumulatedContent,
        });
      }
    }

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
          let responseId = "";
          
          if (continuationToken) {
            const storedResponse = responseStore.get(continuationToken);
            if (storedResponse) {
              accumulatedReasoning = storedResponse.accumulatedReasoning;
              accumulatedContent = storedResponse.accumulatedContent;
              responseId = continuationToken;
            }
          } else {
            responseId = Math.random().toString(36).substring(2);
          }

          try {
            const completion = await openai.chat.completions.create({
              model: "deepseek-r1",
              messages,
              stream: true,
            });

            let chunkCount = 0;
            const CHUNKS_PER_RESPONSE = 100; // 每个响应处理的最大chunk数

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
              }

              chunkCount++;

              // 如果达到chunk限制，保存状态并返回continuation token
              if (chunkCount >= CHUNKS_PER_RESPONSE && !chunk.choices[0].finish_reason) {
                responseStore.set(responseId, {
                  messages,
                  accumulatedReasoning,
                  accumulatedContent,
                  isComplete: false,
                  lastUpdate: Date.now(),
                });

                const data = {
                  type: "continue",
                  continuationToken: responseId,
                  reasoning_content: accumulatedReasoning,
                  content: accumulatedContent,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                controller.close();
                return;
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

                // 如果有存储的响应，标记为完成
                if (responseStore.has(responseId)) {
                  const storedResponse = responseStore.get(responseId)!;
                  storedResponse.isComplete = true;
                  storedResponse.accumulatedReasoning = accumulatedReasoning;
                  storedResponse.accumulatedContent = accumulatedContent;
                  storedResponse.lastUpdate = Date.now();
                }
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