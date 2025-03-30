import { memo, useEffect, useRef, useState } from "react";
import type { Message, MessagePart } from "../utils/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen } from "lucide-react";

// 自定义组件，用于渲染代码块
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  return !inline ? (
    <pre className={`${className} rounded-md bg-gray-50 p-3 my-1.5 overflow-x-auto border border-gray-200`}>
      <code className={`${language ? `language-${language}` : ""} text-xs`} {...props}>
        {children}
      </code>
    </pre>
  ) : (
    <code className="rounded bg-gray-50 px-1 py-0.5 text-xs font-mono border border-gray-200" {...props}>
      {children}
    </code>
  );
};

interface MessageListProps {
  messages: Message[];
}

// 渲染消息内容
const renderMessageContent = (message: Message) => {
  if (typeof message.content === "string") {
    return message.isUser ? (
      <p className="break-words whitespace-pre-wrap text-xs leading-relaxed">
        {message.content}
      </p>
    ) : (
      <div className="markdown-content break-words prose prose-xs max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: CodeBlock,
            p: ({ children }) => (
              <p className="text-xs leading-relaxed mb-2 last:mb-0">
                {children}
              </p>
            ),
            a: ({ node, children, href, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-0.5 text-xs"
                {...props}
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-3 mb-2 last:mb-0 text-xs">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-3 mb-2 last:mb-0 text-xs">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-xs mb-0.5 last:mb-0">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-gray-200 pl-3 italic my-2 text-gray-700 text-xs">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="px-2 py-1.5 text-left text-xs font-semibold bg-gray-50">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-2 py-1.5 text-xs border-t border-gray-200">{children}</td>
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {message.content.map((part, index) => {
        if (part.type === "text") {
          return (
            <p key={index} className="break-words whitespace-pre-wrap text-xs leading-relaxed">
              {part.text}
            </p>
          );
        }
        if (part.type === "page_content") {
          return (
            <div key={index} className="text-xs bg-gray-50 rounded-md p-2 border border-gray-200">
              <div className="font-medium mb-1 text-gray-500">引用页面：{part.page_content?.title}</div>
              <a 
                href={part.page_content?.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline block truncate"
              >
                {part.page_content?.url}
              </a>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

const MessageList = memo(({ messages }: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const checkIfNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;

    const threshold = 100;
    const distanceToBottom = 
      container.scrollHeight - 
      container.scrollTop - 
      container.clientHeight;

    return distanceToBottom <= threshold;
  };

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsNearBottom(checkIfNearBottom());
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 消息更新时的滚动处理
  useEffect(() => {
    if (!isNearBottom) return;

    const container = containerRef.current;
    if (!container) return;

    // 使用 scrollTo 代替 scrollIntoView，避免可能的布局抖动
    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    };

    // 确保在 DOM 更新后执行滚动
    requestAnimationFrame(scrollToBottom);
  }, [messages, isNearBottom]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-3 space-y-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`relative max-w-[85%] px-3 py-2 rounded-xl shadow-sm
              ${
                message.isUser
                  ? "bg-blue-600 text-white after:absolute after:right-0 after:top-[50%] after:translate-x-[50%] after:translate-y-[-50%] after:border-6 after:border-transparent after:border-l-blue-600"
                  : "bg-white text-gray-900 after:absolute after:left-0 after:top-[50%] after:translate-x-[-50%] after:translate-y-[-50%] after:border-6 after:border-transparent after:border-r-white"
              } ${message?.pending ? "animate-pulse" : ""}`}
          >
            {renderMessageContent(message)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = "MessageList";

export default MessageList;
