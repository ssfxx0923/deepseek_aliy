import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// 扩展类型声明以支持阿里云的API返回
interface DeepseekChatMessage extends OpenAI.Chat.Completions.ChatCompletionMessage {
  reasoning_content?: string;
}

// 配置 OpenAI 客户端连接阿里云 API
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
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
      // 创建一个流式响应
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // 储存累积的思考过程和内容
          let accumulatedReasoning = "";
          let accumulatedContent = "";
          
          try {
            // 调用 Deepseek API，使用流式模式
            const completion = await openai.chat.completions.create({
              model: "deepseek-r1", // 此处以 deepseek-r1 为例，可按需更换模型名称
              messages,
              stream: true, // 启用流式输出
            });

            // 处理流式响应
            for await (const chunk of completion) {
              // 检查是否有 reasoning_content
              const reasoning = (chunk.choices[0].delta as any).reasoning_content;
              const content = chunk.choices[0].delta.content;
              
              if (reasoning) {
                accumulatedReasoning += reasoning;
                // 发送思考过程更新
                const data = {
                  type: "reasoning",
                  content: reasoning,
                  fullContent: accumulatedReasoning,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              }
              
              if (content) {
                accumulatedContent += content;
                // 发送内容更新
                const data = {
                  type: "content",
                  content: content,
                  fullContent: accumulatedContent,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              }
              
              // 如果流结束
              if (chunk.choices[0].finish_reason) {
                // 发送完成信号
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
            // 发送错误消息
            const data = {
              type: "error",
              error: error.message,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            controller.close();
            console.error("流式 API 调用错误:", error);
          }
        }
      });

      // 返回 SSE 流
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 非流式模式，使用普通请求
      const completion = await openai.chat.completions.create({
        model: "deepseek-r1", // 此处以 deepseek-r1 为例，可按需更换模型名称
        messages,
      });

      // 使用自定义类型处理返回内容
      const message = completion.choices[0].message as unknown as DeepseekChatMessage;

      // 返回响应
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