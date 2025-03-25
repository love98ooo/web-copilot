import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from 'react';
import { useAI } from '../hooks/useAI';
import type { Message } from '../utils/ai';
import { getAIConfig, updateAIConfig } from '../utils/storage';

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

  const handleModelChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
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
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={handleModelChange}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo（默认）</option>
            {models.map((modelId) => (
              modelId !== 'gpt-3.5-turbo' && (
                <option key={modelId} value={modelId}>
                  {modelId}
                </option>
              )
            ))}
          </select>
          <a
            href="newtab.html"
            target="_blank"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            设置
          </a>
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
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatSidebar;