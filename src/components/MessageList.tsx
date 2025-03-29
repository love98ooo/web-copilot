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
    <pre
      className={`${className} rounded-md bg-gray-50 p-4 my-2 overflow-x-auto border border-gray-200 dark:border-gray-700`}
    >
      <code
        className={`${language ? `language-${language}` : ""} text-sm`}
        {...props}
      >
        {children}
      </code>
    </pre>
  ) : (
    <code
      className="rounded bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 text-sm font-mono border border-gray-200 dark:border-gray-700"
      {...props}
    >
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
      <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
        {message.content}
      </p>
    ) : (
      <div className="markdown-content break-words prose dark:prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: CodeBlock,
            p: ({ children }) => (
              <p className="text-sm leading-relaxed mb-3 last:mb-0">
                {children}
              </p>
            ),
            a: ({ node, children, href, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                {...props}
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-3 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-3 last:mb-0">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-sm mb-1 last:mb-0">{children}</li>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message.content.map((part, index) => {
        if (part.type === "text") {
          return (
            <p
              key={index}
              className="break-words whitespace-pre-wrap text-sm leading-relaxed"
            >
              {part.text}
            </p>
          );
        }
        if (part.type === "page_content") {
          return (
            <div
              key={index}
              className="text-sm bg-gray-50 dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center mb-1.5 text-gray-500 dark:text-gray-300">
                <BookOpen className="h-4 w-4 mr-1.5" />
                <span className="text-xs truncate w-full">
                  {part.page_content?.title}
                </span>
              </div>
              <a
                href={part.page_content?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors py-1 rounded-md block truncate text-xs"
                title={part.page_content?.url}
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
      className="flex-1 overflow-y-auto p-4 space-y-6"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`relative max-w-[85%] px-4 py-3 rounded-2xl shadow-sm
              ${
                message.isUser
                  ? "bg-blue-600 text-white after:absolute after:right-0 after:top-[50%] after:translate-x-[50%] after:translate-y-[-50%] after:border-8 after:border-transparent after:border-l-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 after:absolute after:left-0 after:top-[50%] after:translate-x-[-50%] after:translate-y-[-50%] after:border-8 after:border-transparent after:border-r-white dark:after:border-r-gray-800"
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
