import { memo, useEffect, useRef, useState } from "react";
import type { Message, MessagePart } from "../utils/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      <div className="markdown-content break-words prose prose-xs max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
            <p
              key={index}
              className="break-words whitespace-pre-wrap text-xs leading-relaxed"
            >
              {part.text}
            </p>
          );
        }
        if (part.type === "page_content") {
          return (
            <div
              key={index}
              className="text-xs bg-gray-50 rounded-md p-2 border border-gray-200"
            >
              <div className="font-medium mb-1 text-gray-500">
                引用页面：{part.page_content?.title}
              </div>
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
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceToBottom <= threshold;
  };

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsNearBottom(checkIfNearBottom());
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
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
        behavior: "smooth",
      });
    };

    // 确保在 DOM 更新后执行滚动
    requestAnimationFrame(scrollToBottom);
  }, [messages, isNearBottom]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? "justify-end" : "w-full"}`}
        >
          <div
            className={`${
              message.isUser
                ? "relative max-w-[85%] px-3 py-2 rounded-xl shadow-sm bg-blue-600 text-white after:absolute after:right-0 after:top-[50%] after:translate-x-[50%] after:translate-y-[-50%] after:border-6 after:border-transparent after:border-l-blue-600"
                : "w-full px-3 py-2 bg-white text-gray-900"
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
