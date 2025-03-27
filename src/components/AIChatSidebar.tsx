import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAI } from '../hooks/useAI';
import { aiService } from '../utils/ai';
import type { Message } from '../utils/ai';
import { getAIConfig, watchAIConfig, updateSelectedProvider, getAllProviders } from '../utils/storage';
import type { ProviderConfig, SelectedProviderState } from '../utils/storage';
import { Settings, Send, Eraser } from 'lucide-react';

interface ProviderModels {
  [key: string]: string[];  // key 是 provider 的 id
}

const AIChatSidebar: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [providerModels, setProviderModels] = useState<ProviderModels>({});
  const [selectedProvider, setSelectedProvider] = useState<SelectedProviderState>({
    providerId: '',
    model: ''
  });
  const { sendMessage: sendAIMessage } = useAI();

  useEffect(() => {
    loadConfig();
    // 监听配置变化
    const unwatch = watchAIConfig((newConfig) => {
      getAllProviders().then(providers => {
        setProviders(providers);
        setSelectedProvider(newConfig.selectedProvider);
      });
    });

    return () => unwatch();
  }, []);

  useEffect(() => {
    // 当 provider 的配置变化时，加载对应的模型列表
    providers.forEach(provider => {
      if (provider.apiKey && (!providerModels[provider.id] || providerModels[provider.id].length === 0)) {
        loadModels(provider);
      }
    });
  }, [providers]);

  const loadConfig = async () => {
    try {
      const config = await getAIConfig();
      const providerList = await getAllProviders();
      setProviders(providerList);
      setSelectedProvider(config.selectedProvider);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadModels = async (provider: ProviderConfig) => {
    try {
      const modelList = await aiService.listModels(provider);
      console.debug(modelList)
      setProviderModels(prev => ({
        ...prev,
        [provider.id]: modelList
      }));
    } catch (error) {
      console.error('加载模型列表失败:', error);
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
  };

  const handleSendMessage = async (): Promise<void> => {
    console.log('handleSendMessage', inputValue);
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 添加一个待处理的 AI 消息
      const pendingMessage: Message = {
        id: 'pending',
        content: '正在思考...',
        isUser: false,
        pending: true
      };
      setMessages(prev => [...prev, pendingMessage]);

      const aiResponse = await sendAIMessage(inputValue, selectedProvider.providerId, selectedProvider.model);
      console.debug('aiResponse', aiResponse);

      // 替换待处理消息为实际回复
      setMessages(prev => prev.filter(msg => !msg.pending).concat({
        id: Date.now().toString(),
        content: aiResponse,
        isUser: false
      }));
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.filter(msg => !msg.pending).concat({
        id: Date.now().toString(),
        content: '抱歉，发生了错误。请稍后再试。',
        isUser: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedValue = () => {
    return `${selectedProvider.providerId}:${selectedProvider.model}`;
  };

  const handleClearHistory = async () => {
    try {
      await aiService.clearHistory(selectedProvider.providerId);
      setMessages([]);
    } catch (error) {
      console.error('清除历史记录失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI 网页助手</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearHistory}
            className="h-8 w-8 hover:bg-transparent"
            title="清除对话"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800'
            } ${message.pending ? 'animate-pulse' : ''}`}>
              <p className="break-words">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 justify-between mb-2">
          <div className="flex-1">
            <Select
              value={getSelectedValue()}
              onValueChange={handleProviderModelChange}
              onOpenChange={(open) => {
                if (open) {
                  // 当下拉框打开时，加载所有 provider 的模型列表
                  providers.forEach(provider => {
                    console.debug(provider);
                    loadModels(provider);
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择 Provider 和模型">
                  {(() => {
                    const provider = providers.find(p => p.id === selectedProvider.providerId);
                    if (provider) {
                      return `${provider.name} - ${selectedProvider.model}`;
                    }
                    return selectedProvider.model;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {providers.map((provider) => (
                  <SelectGroup key={provider.id}>
                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {provider.name}
                    </SelectLabel>
                    {providerModels[provider.id]?.map((modelId) => (
                      <SelectItem
                        key={`${provider.id}:${modelId}`}
                        value={`${provider.id}:${modelId}`}
                      >
                        {modelId}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 shrink-0"
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

        {/* 输入框和发送按钮 */}
        <div className="space-y-2">
          <div className="border rounded-xl p-3 bg-muted/50">
            <Textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="按 Enter 发送，Shift + Enter 换行"
              disabled={isLoading}
              className="w-full min-h-[88px] max-h-32 resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                variant="ghost"
                size="sm"
                className="h-8 px-0 hover:bg-transparent"
              >
                <Send className={`h-5 w-5 ${isLoading ? 'text-muted-foreground animate-pulse' : 'text-primary'}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatSidebar;