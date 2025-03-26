import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAIConfig, updateProvider, addProvider, removeProvider } from '@/utils/storage';
import { aiService } from '@/utils/ai';
import type { AIError } from '@/utils/ai';
import { Plus, Trash2 } from 'lucide-react';

interface ProviderFormState {
  apiKey: string;
  baseUrl: string;
  model: string;
  name: string;
}

interface ProviderModels {
  [key: string]: string[];  // key 是 provider 的 apiKey
}

export const SettingsPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderFormState[]>([]);
  const [providerModels, setProviderModels] = useState<ProviderModels>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // 当 provider 的 API Key 改变时，加载对应的模型列表
    providers.forEach((provider, index) => {
      if (provider.apiKey && (!providerModels[provider.apiKey] || providerModels[provider.apiKey].length === 0)) {
        loadModels(provider.apiKey, index);
      }
    });
  }, [providers]);

  const loadConfig = async () => {
    try {
      const config = await getAIConfig();
      setProviders(config.providers.map(p => ({
        apiKey: p.apiKey || '',
        baseUrl: p.baseUrl || '',
        model: p.model || '',
        name: p.name || 'OpenAI'
      })));
    } catch (error) {
      console.error('加载配置失败:', error);
      setStatus('error');
      setErrorMessage('加载配置失败');
    }
  };

  const loadModels = async (apiKey: string, providerIndex: number) => {
    try {
      const provider = providers[providerIndex];
      const modelList = await aiService.listModels(provider);

      // 检查数据是否有变化
      const currentModels = providerModels[apiKey] || [];
      const hasChanges = modelList.length !== currentModels.length ||
        modelList.some((model, idx) => currentModels[idx] !== model);

      if (hasChanges) {
        setProviderModels(prev => ({
          ...prev,
          [apiKey]: modelList
        }));
      }
    } catch (error) {
      const aiError = error as AIError;
      console.error('加载模型列表失败:', aiError);
      setStatus('error');
      setErrorMessage(aiError.message || '加载模型列表失败');
    }
  };

  const handleProviderChange = (index: number, field: keyof ProviderFormState, value: string) => {
    const newProviders = [...providers];
    const oldApiKey = newProviders[index].apiKey;

    newProviders[index] = {
      ...newProviders[index],
      [field]: value
    };

    // 如果 API Key 改变，清除旧的模型列表
    if (field === 'apiKey' && oldApiKey !== value) {
      setProviderModels(prev => {
        const newModels = { ...prev };
        delete newModels[oldApiKey];
        return newModels;
      });
    }

    setProviders(newProviders);
  };

  const handleSave = async (index: number) => {
    try {
      setStatus('saving');
      await updateProvider(index, providers[index]);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('保存配置失败:', error);
      setStatus('error');
      setErrorMessage('保存配置失败');
    }
  };

  const handleAddProvider = async () => {
    try {
      const newProvider = {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        name: `Provider ${providers.length + 1}`
      };
      await addProvider(newProvider);
      await loadConfig();
    } catch (error) {
      console.error('添加 Provider 失败:', error);
      setStatus('error');
      setErrorMessage('添加 Provider 失败');
    }
  };

  const handleRemoveProvider = async (index: number) => {
    try {
      const provider = providers[index];
      await removeProvider(index);
      // 清除被删除 provider 的模型列表
      setProviderModels(prev => {
        const newModels = { ...prev };
        delete newModels[provider.apiKey];
        return newModels;
      });
      await loadConfig();
    } catch (error) {
      console.error('删除 Provider 失败:', error);
      setStatus('error');
      setErrorMessage('删除 Provider 失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">AI 网页助手设置</h1>
          <Button onClick={handleAddProvider} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加 Provider
          </Button>
        </div>

        <div className="space-y-8">
          {providers.map((provider, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Input
                    value={provider.name}
                    onChange={(e) => handleProviderChange(index, 'name', e.target.value)}
                    placeholder="Provider 名称"
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {providers.length > 1 && (
                    <Button
                      onClick={() => handleRemoveProvider(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <Input
                  type="password"
                  value={provider.apiKey}
                  onChange={(e) => handleProviderChange(index, 'apiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Base URL
                </label>
                <Input
                  type="text"
                  value={provider.baseUrl}
                  onChange={(e) => handleProviderChange(index, 'baseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  如果使用代理服务，请在此设置代理地址
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI 模型
                </label>
                <Select
                  value={provider.model}
                  onValueChange={(value) => handleProviderChange(index, 'model', value)}
                  onOpenChange={(open) => {
                    if (open && provider.apiKey) {
                      loadModels(provider.apiKey, index);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择 AI 模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerModels[provider.apiKey]?.map((modelId) => (
                      <SelectItem key={modelId} value={modelId}>
                        {modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-sm text-gray-500">
                  选择要使用的 AI 模型。不同模型的能力和价格不同。
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleSave(index)}
                  disabled={status === 'saving'}
                  variant="default"
                >
                  {status === 'saving' ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 状态信息 */}
        {status === 'error' && (
          <div className="mt-4 text-red-600 text-sm">{errorMessage}</div>
        )}
        {status === 'success' && (
          <div className="mt-4 text-green-600 text-sm">设置已保存</div>
        )}
      </div>
    </div>
  );
};