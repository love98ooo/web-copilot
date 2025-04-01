import React, { useEffect, useState } from 'react';
import type { SessionSummary } from '../utils/history';
import { chatHistoryService } from '../utils/history';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ChatHistoryProps {
  onSelect: (sessionId: string) => void;
  currentSessionId?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  onSelect,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    const loadSessions = async () => {
      const summaries = await chatHistoryService.getSessionSummaries();
      setSessions(summaries);
    };

    loadSessions();
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // 阻止事件冒泡
    await chatHistoryService.deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  return (
    <div className="h-full px-4">
      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          暂无历史记录
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative w-full text-left p-3 rounded-lg border transition-colors
                ${session.id === currentSessionId
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                  : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className="w-full text-left"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm truncate flex-1 mr-2">
                    {session.title}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(session.updatedAt, { locale: zhCN, addSuffix: true })}
                  </span>
                </div>
                {session.lastMessage && (
                  <p className="text-xs text-gray-500 truncate">
                    {session.lastMessage.isUser ? '你：' : 'AI：'}
                    {session.lastMessage.content}
                  </p>
                )}
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span className="mr-2">{session.model}</span>
                  <span>{session.messageCount} 条消息</span>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(e, session.id)}
                className="absolute -right-1 -top-1 h-3 w-3 p-0.5 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:bg-red-50 hover:text-red-400 ring-1 ring-gray-200"
                title="删除会话"
              >
                <X className="h-2 w-2 stroke-[2.5]" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistory;