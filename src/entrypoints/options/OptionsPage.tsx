import React, { useEffect, useState } from 'react';
import { getAIConfig, updateAIConfig, resetAIConfig } from '@/utils/storage';
import { aiService } from '@/utils/ai';
import type { AIError } from '@/utils/ai';

const OptionsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (apiKey) {
      loadModels();
    }
  }, [apiKey]);

  const loadConfig = async () => {
    try {
      const config = await getAIConfig();
      setApiKey(config.apiKey || '');
      setBaseUrl(config.baseUrl || '');
      setModel(config.model || '');
    } catch (error) {
      console.error('加载配置失败:', error);
      setStatus('error');
      setErrorMessage('加载配置失败');
    }
  };

  const loadModels = async () => {
    try {
      const modelList = await aiService.listModels();
      setModels(modelList);
    } catch (error) {
      const aiError = error as AIError;
      console.error('加载模型列表失败:', aiError);
      setStatus('error');
      setErrorMessage(aiError.message || '加载模型列表失败');
    }
  };

  const handleSave = async () => {
    try {
      setStatus('saving');
      await updateAIConfig({
        apiKey,
        baseUrl: baseUrl.trim() || undefined,
        model: model || 'gpt-3.5-turbo'
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('保存配置失败:', error);
      setStatus('error');
      setErrorMessage('保存配置失败');
    }
  };

  const handleReset = async () => {
    try {
      setStatus('saving');
      await resetAIConfig();
      const config = await getAIConfig();
      setApiKey(config.apiKey || '');
      setBaseUrl(config.baseUrl || '');
      setModel(config.model || '');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('重置配置失败:', error);
      setStatus('error');
      setErrorMessage('重置配置失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">AI 网页助手设置</h1>
        
        <div className="space-y-6">
          {/* API Key 设置 */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sk-..."
            />
          </div>

          {/* Base URL 设置 */}
          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
              API Base URL（可选）
            </label>
            <input
              type="text"
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://api.openai.com/v1"
            />
            <p className="mt-1 text-sm text-gray-500">
              如果使用代理服务，请在此设置代理地址
            </p>
          </div>

          {/* 模型选择 */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              AI 模型
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <p className="mt-1 text-sm text-gray-500">
              选择要使用的 AI 模型。不同模型的能力和价格不同。
            </p>
          </div>

          {/* 状态信息 */}
          {status === 'error' && (
            <div className="text-red-600 text-sm">{errorMessage}</div>
          )}
          {status === 'success' && (
            <div className="text-green-600 text-sm">设置已保存</div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {status === 'saving' ? '保存中...' : '保存设置'}
            </button>
            <button
              onClick={handleReset}
              disabled={status === 'saving'}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              重置设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsPage; 