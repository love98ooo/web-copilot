import React, { useState, KeyboardEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAI } from '../hooks/useAI';
import type { Message, MessagePart } from '../utils/ai';
import { getAIConfig, watchAIConfig, updateSelectedProvider, getAllProviders } from '../utils/storage';
import type { ProviderConfig, SelectedProviderState } from '../utils/storage';
import { Settings, Send, FileText, History, MessageSquarePlus, Pencil, Eye, X } from 'lucide-react';
import { pageService } from '../utils/page';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import ChatHistory from './ChatHistory';
import MessageList from './MessageList';

import { chatHistoryService } from '../utils/history';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2 } from 'lucide-react';
import type { AIConfig } from '../utils/ai';
import AIConfigSettings from './AIConfigSettings';

interface ProviderModels {
  [key: string]: string[];  // key 是 provider 的 id
}

const AIChatSidebar: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SelectedProviderState>({
    providerId: '',
    model: ''
  });
  const [pageMaterial, setPageMaterial] = useState<PageContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const {
    sendMessage: sendAIMessage,
    getCurrentSession,
    switchSession
  } = useAI();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    systemPrompt: undefined,
    temperature: 0.7,
    presencePenalty: 0,
    frequencyPenalty: 0,
    maxTokens: 2000
  });

  // 使用 useCallback 包装加载消息的函数
  const loadMessages = useCallback(() => {
    const currentSession = getCurrentSession();
    if (currentSession) {
      console.debug('加载消息:', currentSession.messages.length);
      setMessages(currentSession.messages);
    }
  }, []); // 移除 getCurrentSession 依赖

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      loadMessages();
    };
    init();

    // 监听配置变化
    const unwatch = watchAIConfig((newConfig) => {
      getAllProviders().then(providers => {
        setProviders(providers);
        setSelectedProvider(newConfig.selectedProvider);
      });
    });

    return () => unwatch();
  }, []); // 移除 loadMessages 依赖

  const loadConfig = async () => {
    try {
      const config = await getAIConfig();
      const providerList = await getAllProviders();
      console.debug('providerList:', providerList);
      setProviders(providerList);
      setSelectedProvider(config.selectedProvider);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim() && !isLoading) {
      e.preventDefault(); // 防止换行
      handleSendMessage();
    }
  };

  const handleProviderModelChange = async (value: string) => {
    const [providerId, model] = value.split(':');
    const newSelectedProvider = {
      providerId,
      model
    };
    setSelectedProvider(newSelectedProvider);
    await updateSelectedProvider(newSelectedProvider);

    // 获取当前会话的最新消息
    const currentSession = getCurrentSession();
    if (currentSession) {
      setMessages(currentSession.messages);
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    // 构建消息内容
    let messageContent: string | MessagePart[];
    if (pageMaterial) {
      messageContent = [
        {
          type: 'text',
          text: inputValue
        },
        {
          type: 'page_content',
          page_content: {
            url: pageMaterial.url,
            title: pageMaterial.title,
            content: pageMaterial.content,
            metadata: pageMaterial.metadata
          }
        }
      ];
    } else {
      messageContent = inputValue;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      isUser: true
    };

    setInputValue('');
    setPageMaterial(null);
    setIsLoading(true);

    try {
      // 添加用户消息
      setMessages(prev => [...prev, userMessage]);

      // 创建 AI 响应消息
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: '',
        isUser: false,
        pending: true
      };

      // 添加初始的 AI 响应消息
      setMessages(prev => [...prev, aiMessage]);

      // 发送消息并获取 AI 响应流
      const response = await sendAIMessage(
        messageContent,
        selectedProvider.providerId,
        selectedProvider.model,
        // 处理流式响应的回调函数
        (chunk: string) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.id === aiMessageId) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: (lastMessage.content as string) + chunk,
                  pending: false
                }
              ];
            }
            return prev;
          });
        },
        aiConfig  // 添加 AI 配置
      );

      // 如果流式响应失败，使用完整响应更新
      if (response) {
        setMessages(prev => {
          const messagesWithoutLast = prev.slice(0, -1);
          return [...messagesWithoutLast, {
            id: aiMessageId,
            content: response.content,
            isUser: false,
            pending: false
          }];
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const messagesWithoutPending = prev.filter(msg => !msg.pending);
        return [...messagesWithoutPending, {
          id: Date.now().toString(),
          content: '抱歉，发生了错误。请稍后再试。',
          isUser: false
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedValue = () => {
    return `${selectedProvider.providerId}:${selectedProvider.model}`;
  };

  const handleReadPage = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // 使用 pageService 从当前标签页读取页面内容
      const pageContent = await pageService.readPageFromTab();

      // 更新页面物料状态，保持原有的 PageContent 结构
      setPageMaterial({
        url: pageContent.url,
        title: pageContent.title,
        content: pageContent.markdown, // 在消息中使用 markdown 内容
        markdown: pageContent.markdown, // 保持原有的 markdown 字段
        metadata: pageContent.metadata
      });
    } catch (error) {
      console.error('读取页面失败:', error);
      setPageMaterial(null);

      // 创建一个错误消息
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '读取页面失败，请稍后再试。',
        isUser: false
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 选择历史记录
  const handleSelectSession = async (sessionId: string) => {
    const session = await chatHistoryService.getSession(sessionId);
    if (session) {
      await switchSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setIsHistoryOpen(false);
    }
  };

  // 渲染 AI 参数设置面板
  const renderAISettings = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="AI 参数设置"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <AIConfigSettings
          config={aiConfig}
          onChange={setAIConfig}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 消息列表 */}
      <MessageList messages={messages} />

      {/* 输入区域 */}
      <div className="p-3 border-t border-gray-200">
        {/* 工具栏 */}
        <div className="flex items-center gap-1.5 justify-between mb-2">
          <div className="max-w-[calc(80%-100px)] w-40">
            {/* {模型选择} */}
            <Select
              value={getSelectedValue()}
              onValueChange={handleProviderModelChange}
              onOpenChange={async (open) => {
                if (open) {
                  // 重新获取最新的 providers 列表
                  const latestProviders = await getAllProviders();
                  // 检查是否有更新（包括 provider 信息和模型列表）
                  const hasUpdates = latestProviders.some(latest => {
                    const current = providers.find(p => p.id === latest.id);
                    if (!current) return true;
                    
                    // 检查 provider 的所有属性是否有变化
                    return latest.name !== current.name ||
                           latest.type !== current.type ||
                           latest.apiKey !== current.apiKey ||
                           latest.baseUrl !== current.baseUrl ||
                           JSON.stringify(latest.models) !== JSON.stringify(current.models);
                  });
                  
                  if (hasUpdates) {
                    console.debug('检测到 Provider 或模型列表有更新');
                    setProviders(latestProviders);
                  }
                }
              }}
            >
              <SelectTrigger className="text-sm h-8 w-full">
                <SelectValue placeholder="选择 Provider 和模型">
                  <span className="inline-block truncate max-w-full">
                  {(() => {
                    const provider = providers.find(p => p.id === selectedProvider.providerId);
                    if (provider) {
                      return `${selectedProvider.model}`;
                    }
                    return selectedProvider.model;
                  })()}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {providers.map((provider) => (
                  <SelectGroup key={provider.id}>
                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {provider.name}
                    </SelectLabel>
                    {provider.models.map((modelId) => (
                      <SelectItem
                        key={`${provider.id}:${modelId}`}
                        value={`${provider.id}:${modelId}`}
                        className="text-sm"
                      >
                        {modelId}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            {/* {读取页面内容} */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReadPage}
              className="h-8 w-8 shrink-0"
              title="读取页面内容"
              disabled={isLoading}
            >
              <FileText className="h-4 w-4" />
            </Button>

            {/* 新会话 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                switchSession(undefined);
                setMessages([]);
                setCurrentSessionId(undefined);
              }}
              className="h-8 w-8 shrink-0"
              title="新会话"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>

            {/* 历史记录 */}
            <Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="历史记录"
                >
                  <History className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="mx-auto w-full max-w-sm h-[95vh] flex flex-col">
                <DrawerHeader className="pb-4 flex-none relative z-10">
                  <DrawerTitle className="text-sm">历史记录</DrawerTitle>
                  <DrawerDescription className="text-xs">选择历史记录，切换会话</DrawerDescription>
                  <div className="absolute -bottom-4 left-0 right-0 h-8 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none"></div>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto -mt-4 relative">
                  <div className="absolute inset-0 pt-6">
                    <ChatHistory
                      onSelect={handleSelectSession}
                      currentSessionId={currentSessionId}
                    />
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {/* AI 参数设置 */}
            {renderAISettings()}

            {/* {设置} */}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 shrink-0"
            >
              <a
                href="newtab.html"
                target="_blank"
                title="设置"
              >
                <Settings className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* 物料展示区域 */}
        {pageMaterial && (
          <div className="mb-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">页面物料</h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                  title={isEditing ? "预览" : "编辑"}
                >
                  {isEditing ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPageMaterial(null)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                  title="关闭"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="font-sm mr-2 min-w-8">标题:</span>
                <span className="text-gray-600 truncate">{pageMaterial.title}</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-sm mr-2 min-w-8">URL:</span>
                <a
                  href={pageMaterial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  {pageMaterial.url}
                </a>
              </div>
              <div className="text-sm">
                <div className="font-sm mb-1">内容预览:</div>
                {isEditing ? (
                  <Textarea
                    value={pageMaterial.content}
                    onChange={(e) => {
                      setPageMaterial(prev => prev ? {
                        ...prev,
                        content: e.target.value,
                        markdown: e.target.value
                      } : null);
                    }}
                    className="w-full min-h-[100px] max-h-[300px] text-xs resize-y bg-white border-gray-200"
                    placeholder="编辑页面内容..."
                  />
                ) : (
                  <p className="text-gray-600 text-xs line-clamp-2 overflow-y-auto">
                    {pageMaterial.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 输入框和发送按钮 */}
        <div className="space-y-2">
          <div className="border rounded-lg p-2.5 bg-muted/50">
            <Textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="按 Enter 发送，Shift + Enter 换行"
              disabled={isLoading}
              className="w-full min-h-[72px] max-h-28 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                variant="ghost"
                size="sm"
                className="h-7 px-0 hover:bg-transparent"
              >
                <Send className={`h-4 w-4 ${isLoading ? 'text-muted-foreground animate-pulse' : 'text-primary'}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatSidebar;