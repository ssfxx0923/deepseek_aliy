'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * 消息类型定义
 * @typedef {Object} Message
 * @property {'user' | 'assistant'} role - 消息发送者的角色
 * @property {string} content - 消息内容
 * @property {string} [reasoning] - AI 的思考过程（可选）
 * @property {boolean} [isStreaming] - 是否正在流式接收中（可选）
 */
type Message = {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
};

/**
 * 聊天界面组件
 * 实现了与 Deepseek AI 的实时对话功能，支持流式响应和 Markdown 渲染
 */
export default function ChatInterface() {
  // 状态管理
  const [input, setInput] = useState('');  // 用户输入
  const [messages, setMessages] = useState<Message[]>([]);  // 对话历史
  const [loading, setLoading] = useState(false);  // 加载状态
  const [isSending, setIsSending] = useState(false);  // 发送状态
  
  // DOM 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);  // 用于自动滚动
  const chatContainerRef = useRef<HTMLDivElement>(null);  // 聊天容器引用
  const shouldScrollRef = useRef(true);  // 控制是否应该自动滚动

  /**
   * 滚动到对话底部
   * 只在 shouldScrollRef 为 true 时执行
   */
  const scrollToBottom = () => {
    if (shouldScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * 监听滚动事件
   * 当用户手动滚动时，根据滚动位置决定是否启用自动滚动
   */
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        // 如果用户向上滚动超过 200px，则禁用自动滚动
        shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 200;
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  /**
   * 在发送新消息时启用自动滚动
   */
  useEffect(() => {
    if (isSending) {
      shouldScrollRef.current = true;
      scrollToBottom();
    }
  }, [isSending]);

  /**
   * 更新消息列表
   * @param data - 响应数据
   * @param isError - 是否为错误响应
   */
  const updateMessages = (data: any, isError: boolean) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = isError ? `抱歉，出现了错误: ${data.error}` : data.content;
        lastMessage.isStreaming = false;
        return newMessages;
      } else {
        return [...prev.filter(msg => !msg.isStreaming), {
          role: 'assistant',
          content: isError ? `抱歉，出现了错误: ${data.error}` : data.content,
        }];
      }
    });
  };

  /**
   * 处理表单提交
   * 发送用户消息并处理 AI 响应
   * @param e - 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    // 发送新消息时启用自动滚动
    shouldScrollRef.current = true;
    scrollToBottom();
    
    // 添加用户消息
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsSending(true);
    
    // 创建初始的助手回复消息
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      reasoning: '',
      isStreaming: true,
    }]);

    try {
      // 发送请求获取流式响应
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      
      setIsSending(false);
      
      // 处理流式响应
      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let contentBuffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const text = decoder.decode(value);
            contentBuffer += text;
            
            // 处理多行数据
            const lines = contentBuffer.split('\n\n');
            contentBuffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  // 根据数据类型更新消息
                  switch (data.type) {
                    case 'reasoning':
                      // 更新思考过程
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.reasoning = data.fullContent;
                        }
                        return newMessages;
                      });
                      break;
                    case 'content':
                      // 更新内容
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = data.fullContent;
                        }
                        return newMessages;
                      });
                      break;
                    case 'done':
                      // 完成流式响应
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = data.content;
                          lastMessage.reasoning = data.reasoning_content;
                          lastMessage.isStreaming = false;
                        }
                        return newMessages;
                      });
                      setLoading(false);
                      break;
                    case 'error':
                      // 处理错误
                      console.error('流响应错误:', data.error);
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = `抱歉，出现了错误: ${data.error}`;
                          lastMessage.isStreaming = false;
                        }
                        return newMessages;
                      });
                      setLoading(false);
                      break;
                  }
                } catch (error) {
                  console.error('解析SSE数据失败:', error);
                }
              }
            }
          }
        }
      } else {
        // 非流式响应处理
        const data = await response.json();
        updateMessages(data, !response.ok);
      }
    } catch (error: any) {
      console.error('请求错误:', error);
      setIsSending(false);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = '抱歉，发生了网络错误，请稍后再试。';
          lastMessage.isStreaming = false;
          return newMessages;
        } else {
          return [...prev.filter(msg => !msg.isStreaming), {
            role: 'assistant',
            content: '抱歉，发生了网络错误，请稍后再试。',
          }];
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // 在消息更新时，根据 shouldScrollRef 决定是否滚动
  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // 添加复制功能的组件
  const CodeBlock = ({ inline, children, ...props }: { inline?: boolean, children: any } & any) => {
    const [isCopied, setIsCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    const handleCopy = async () => {
      if (codeRef.current) {
        try {
          // 获取实际的代码内容
          const codeContent = codeRef.current.textContent || '';
          await navigator.clipboard.writeText(codeContent);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      }
    };

    if (inline) {
      return <code className="bg-gray-800 px-1 rounded" {...props}>{children}</code>;
    }

    return (
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 px-2 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 transition-colors duration-200 opacity-0 group-hover:opacity-100 z-10"
        >
          {isCopied ? '已复制!' : '复制'}
        </button>
        <code ref={codeRef} className="block bg-gray-800 p-4 rounded" {...props}>
          {children}
        </code>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 对话区域：固定高度且overflow-y-auto，防止高度跳变 */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px]"
        onWheel={() => {
          // 用户使用鼠标滚轮时，暂时禁用自动滚动
          shouldScrollRef.current = false;
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold gradient-text mb-3">AI 对话助手</h2>
            <p className="text-gray-400 max-w-md">
               Deepseek 大模型，探索 AI 的无限可能
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`${message.role === 'user' ? 'message-user' : 'message-assistant'} animate-fadeIn`}
            >
              <div className="font-semibold mb-1 text-sm">
                {message.role === 'user' ? '用户:' : 'deepseek:'}
              </div>
              
              {/* 思考过程 */}
              {message.reasoning && (
                <div className="mb-3 transition-all duration-200">
                  <div className="text-xs text-gray-400 mb-1">思考过程:</div>
                  <div className="reasoning-box">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[
                        rehypeRaw,
                        rehypeHighlight,
                        [rehypeKatex, {
                          throwOnError: false,
                          macros: {
                            "\\pm": "\\pm",
                            "\\sqrt": "\\sqrt",
                            "\\frac": "\\frac",
                            "\\text": "\\text",
                            "\\quad": "\\quad",
                            "\\sum": "\\sum",
                            "\\sigma": "\\sigma",
                            "\\pi": "\\pi",
                            "\\alpha": "\\alpha",
                            "\\beta": "\\beta",
                            "\\gamma": "\\gamma",
                            "\\delta": "\\delta",
                            "\\epsilon": "\\epsilon",
                            "\\zeta": "\\zeta",
                            "\\eta": "\\eta",
                            "\\theta": "\\theta",
                            "\\iota": "\\iota",
                            "\\kappa": "\\kappa",
                            "\\lambda": "\\lambda",
                            "\\mu": "\\mu",
                            "\\nu": "\\nu",
                            "\\xi": "\\xi",
                            "\\omicron": "\\omicron",
                            "\\rho": "\\rho",
                            "\\tau": "\\tau",
                            "\\upsilon": "\\upsilon",
                            "\\phi": "\\phi",
                            "\\chi": "\\chi",
                            "\\psi": "\\psi",
                            "\\omega": "\\omega",
                            "\\int": "\\int",
                            "\\infty": "\\infty",
                            "\\lim": "\\lim",
                            "\\partial": "\\partial",
                            "\\cdot": "\\cdot",
                            "\\times": "\\times",
                            "\\leq": "\\leq",
                            "\\geq": "\\geq",
                            "\\neq": "\\neq",
                            "\\approx": "\\approx",
                            "\\equiv": "\\equiv",
                            "\\ldots": "\\ldots",
                            "\\cdots": "\\cdots",
                            "\\vdots": "\\vdots",
                            "\\ddots": "\\ddots",
                            "\\to": "\\to",
                            "\\rightarrow": "\\rightarrow",
                            "\\leftarrow": "\\leftarrow",
                            "\\Rightarrow": "\\Rightarrow",
                            "\\Leftarrow": "\\Leftarrow",
                            "\\subset": "\\subset",
                            "\\supset": "\\supset",
                            "\\in": "\\in",
                            "\\notin": "\\notin",
                            "\\cup": "\\cup",
                            "\\cap": "\\cap",
                            "\\emptyset": "\\emptyset"
                          },
                          output: 'html',
                          displayMode: true,
                          minRuleThickness: 0.05,
                          maxSize: 10,
                          maxExpand: 1000,
                          fleqn: false,
                          globalGroup: false,
                          colorIsTextColor: false
                        }]
                      ]}
                      components={{
                        p: ({node, ...props}) => <p {...props} />,
                        div: ({node, ...props}) => <div {...props} />
                      }}
                    >
                      {message.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              
              {/* 正式回答 */}
              <div className="prose prose-invert max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:border-collapse">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[
                    rehypeRaw,
                    rehypeHighlight,
                    [rehypeKatex, {
                      throwOnError: false,
                      macros: {
                        "\\pm": "\\pm",
                        "\\sqrt": "\\sqrt",
                        "\\frac": "\\frac",
                        "\\text": "\\text",
                        "\\quad": "\\quad",
                        "\\sum": "\\sum",
                        "\\sigma": "\\sigma",
                        "\\pi": "\\pi",
                        "\\alpha": "\\alpha",
                        "\\beta": "\\beta",
                        "\\gamma": "\\gamma",
                        "\\delta": "\\delta",
                        "\\epsilon": "\\epsilon",
                        "\\zeta": "\\zeta",
                        "\\eta": "\\eta",
                        "\\theta": "\\theta",
                        "\\iota": "\\iota",
                        "\\kappa": "\\kappa",
                        "\\lambda": "\\lambda",
                        "\\mu": "\\mu",
                        "\\nu": "\\nu",
                        "\\xi": "\\xi",
                        "\\omicron": "\\omicron",
                        "\\rho": "\\rho",
                        "\\tau": "\\tau",
                        "\\upsilon": "\\upsilon",
                        "\\phi": "\\phi",
                        "\\chi": "\\chi",
                        "\\psi": "\\psi",
                        "\\omega": "\\omega",
                        "\\int": "\\int",
                        "\\infty": "\\infty",
                        "\\lim": "\\lim",
                        "\\partial": "\\partial",
                        "\\cdot": "\\cdot",
                        "\\times": "\\times",
                        "\\leq": "\\leq",
                        "\\geq": "\\geq",
                        "\\neq": "\\neq",
                        "\\approx": "\\approx",
                        "\\equiv": "\\equiv",
                        "\\ldots": "\\ldots",
                        "\\cdots": "\\cdots",
                        "\\vdots": "\\vdots",
                        "\\ddots": "\\ddots",
                        "\\to": "\\to",
                        "\\rightarrow": "\\rightarrow",
                        "\\leftarrow": "\\leftarrow",
                        "\\Rightarrow": "\\Rightarrow",
                        "\\Leftarrow": "\\Leftarrow",
                        "\\subset": "\\subset",
                        "\\supset": "\\supset",
                        "\\in": "\\in",
                        "\\notin": "\\notin",
                        "\\cup": "\\cup",
                        "\\cap": "\\cap",
                        "\\emptyset": "\\emptyset"
                      },
                      output: 'html',
                      displayMode: true,
                      minRuleThickness: 0.05,
                      maxSize: 10,
                      maxExpand: 1000,
                      fleqn: false,
                      globalGroup: false,
                      colorIsTextColor: false,
                      strict: (_context: unknown) => false,
                      trust: (_context: unknown) => true
                    }]
                  ]}
                  components={{
                    table: ({node, ...props}) => (
                      <table className="border-collapse border border-gray-700 my-4" {...props} />
                    ),
                    th: ({node, ...props}) => (
                      <th className="border border-gray-700 px-4 py-2 bg-gray-800" {...props} />
                    ),
                    td: ({node, ...props}) => (
                      <td className="border border-gray-700 px-4 py-2" {...props} />
                    ),
                    h1: ({node, ...props}) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
                    ),
                    h2: ({node, ...props}) => (
                      <h2 className="text-xl font-bold mt-5 mb-3" {...props} />
                    ),
                    h3: ({node, ...props}) => (
                      <h3 className="text-lg font-bold mt-4 mb-2" {...props} />
                    ),
                    code: ({node, inline, ...props}: {node: any, inline?: boolean} & any) => (
                      <CodeBlock inline={inline} {...props} />
                    ),
                    // @ts-ignore
                    math: ({value}: {value: string}) => {
                      try {
                        // 清理输入，去除多余的空格
                        const cleanedValue = value
                          .replace(/\begin{align\*?}/g, '\\begin{aligned}')
                          .replace(/\end{align\*?}/g, '\\end{aligned}')
                          .replace(/\begin{matrix}/g, '\\begin{pmatrix}')
                          .replace(/\end{matrix}/g, '\\end{pmatrix}')
                          .trim(); // 去除首尾空格

                        return (
                          <div className="math-display my-4">
                            <span 
                              dangerouslySetInnerHTML={{ 
                                __html: katex.renderToString(cleanedValue, {
                                  displayMode: true,
                                  throwOnError: false,
                                  trust: true,
                                  strict: false,
                                  macros: {
                                    "\\R": "\\mathbb{R}",
                                    "\\N": "\\mathbb{N}",
                                    "\\Z": "\\mathbb{Z}",
                                    "\\Q": "\\mathbb{Q}",
                                    "\\C": "\\mathbb{C}",
                                    "\\int": "\\int",
                                    "\\sum": "\\sum",
                                    "\\frac": "\\frac",
                                    "\\sqrt": "\\sqrt",
                                    "\\begin{aligned}": "\\begin{aligned}",
                                    "\\end{aligned}": "\\end{aligned}",
                                    "\\begin{pmatrix}": "\\begin{pmatrix}",
                                    "\\end{pmatrix}": "\\end{pmatrix}"
                                  }
                                })
                              }} 
                            />
                          </div>
                        );
                      } catch (error) {
                        console.error('LaTeX渲染错误:', error);
                        return <div className="katex-error">LaTeX渲染错误: {value}</div>;
                      }
                    },
                    // @ts-ignore
                    inlineMath: ({value}: {value: string}) => {
                      try {
                        const cleanedValue = value
                          .replace(/\\begin{align\*?}/g, '\\begin{aligned}')
                          .replace(/\\end{align\*?}/g, '\\end{aligned}')
                          .replace(/\\begin{matrix}/g, '\\begin{pmatrix}')
                          .replace(/\\end{matrix}/g, '\\end{pmatrix}');

                        return (
                          <span className="math-inline"
                            dangerouslySetInnerHTML={{ 
                              __html: katex.renderToString(cleanedValue, {
                                displayMode: false,
                                throwOnError: false,
                                trust: true,
                                strict: false,
                                macros: {
                                  "\\R": "\\mathbb{R}",
                                  "\\N": "\\mathbb{N}",
                                  "\\Z": "\\mathbb{Z}",
                                  "\\Q": "\\mathbb{Q}",
                                  "\\C": "\\mathbb{C}",
                                  "\\int": "\\int",
                                  "\\sum": "\\sum",
                                  "\\frac": "\\frac",
                                  "\\sqrt": "\\sqrt",
                                  "\\begin{aligned}": "\\begin{aligned}",
                                  "\\end{aligned}": "\\end{aligned}",
                                  "\\begin{pmatrix}": "\\begin{pmatrix}",
                                  "\\end{pmatrix}": "\\end{pmatrix}"
                                }
                              })
                            }}
                          />
                        );
                      } catch (error) {
                        console.error('LaTeX渲染错误:', error);
                        return <span className="katex-error">LaTeX渲染错误: {value}</span>;
                      }
                    },
                    p: ({node, ...props}) => <p {...props} />,
                    div: ({node, ...props}) => <div {...props} />
                  }}
                >
                  {message.content || (message.isStreaming ? '...' : '')}
                </ReactMarkdown>
              </div>
              
              {/* 思考中的动画 */}
              {message.isStreaming && !message.reasoning && (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">思考过程:</div>
                  <div className="reasoning-box flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {loading && !messages[messages.length - 1]?.isStreaming && (
          <div className="message-assistant animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="font-semibold">AI 助手正在思考</div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="border-t border-gray-800 p-3">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            className="deepseek-input"
            disabled={isSending}
          />
          <button type="submit" className="deepseek-button" disabled={isSending}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
} 