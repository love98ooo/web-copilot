import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAI } from '../hooks/useAI';
import type { Message } from '../utils/ai';
import { getAIConfig, updateAIConfig } from '../utils/storage';
import { SelectIcon } from '@radix-ui/react-select';
import { Settings } from 'lucide-react';

const AIChatSidebar: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [model, setModel] = useState<string>('gpt-4o');
  const { sendMessage: sendAIMessage, listModels } = useAI();
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getAIConfig();
      if (config.apiKey) {
        setModel(config.model);
        const modelList = await listModels();
        setModels(modelList);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
      handleSendMessage();
    }
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

      const aiResponse = await sendAIMessage(inputValue);
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

  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    try {
      await updateAIConfig({ model: newModel });
    } catch (error) {
      console.error('更新模型设置失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold mb-2">AI 网页助手</h1>
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
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 justify-between">
          <div className="w-40">
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9"
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
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyUpCapture={handleKeyPress}
            placeholder="问任何问题，@ 模型，/ 提示"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            variant="default"
          >
            {isLoading ? '发送中...' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatSidebar;