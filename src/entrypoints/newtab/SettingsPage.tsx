import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAIConfig, updateProvider, addProvider, removeProvider, getAllProviders } from '@/utils/storage';
import { aiService } from '@/utils/ai';
import type { AIError } from '@/utils/ai';
import type { ProviderConfig, ProviderType } from '@/utils/storage';
import { Plus, Trash2 } from 'lucide-react';

interface ProviderFormState {
  id: string;
  type: ProviderType;
  apiKey: string;
  baseUrl: string;
  name: string;
  models: string[];
}

// SDK 类型选项
const SDK_TYPES: { value: ProviderType; label: string; baseUrl?: string }[] = [
  { value: 'openai', label: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1' },
  { value: 'gemini', label: 'Google Gemini', baseUrl: '' }
];

export const SettingsPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderFormState[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const providers = await getAllProviders();
      setProviders(providers.map(p => ({
        id: p.id,
        type: p.type,
        apiKey: p.apiKey,
        baseUrl: p.baseUrl,
        name: p.name,
        models: p.models
      })));
    } catch (error) {
      console.error('加载配置失败:', error);
      setStatus('error');
      setErrorMessage('加载配置失败');
    }
  };

  const loadModels = async (provider: ProviderFormState): Promise<string[]> => {
    try {
      return await aiService.listModels(provider);
    } catch (error) {
      const aiError = error as AIError;
      console.error('加载模型列表失败:', aiError);
      setStatus('error');
      setErrorMessage(aiError.message || '加载模型列表失败');
      return [];
    }
  };

  const handleProviderChange = (index: number, field: keyof ProviderFormState, value: string) => {
    const newProviders = [...providers];
    const provider = newProviders[index];

    if (field === 'type') {
      // 当切换 SDK 类型时，更新 baseUrl 和清空模型列表
      const sdkType = SDK_TYPES.find(type => type.value === value);
      if (sdkType) {
        newProviders[index] = {
          ...provider,
          type: value as ProviderType,
          baseUrl: sdkType.baseUrl || '',
          models: []
        };
      }
    } else {
      newProviders[index] = {
        ...provider,
        [field]: value
      };
    }

    setProviders(newProviders);
  };

  const handleSave = async (index: number) => {
    try {
      setStatus('saving');
      const provider = providers[index];

      // 获取最新的模型列表
      const modelList = await loadModels(provider);

      // 更新 provider 配置
      await updateProvider(provider.id, {
        ...provider,
        models: modelList
      });

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
        type: 'openai' as ProviderType,
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        name: `Provider ${providers.length + 1}`,
        models: []
      };

      const id = await addProvider(newProvider);
      await loadConfig();
    } catch (error) {
      console.error('添加 Provider 失败:', error);
      setStatus('error');
      setErrorMessage('添加 Provider 失败');
    }
  };

  const handleRemoveProvider = async (id: string) => {
    try {
      await removeProvider(id);
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
            <div key={provider.id} className="p-4 border rounded-lg space-y-4">
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
                      onClick={() => handleRemoveProvider(provider.id)}
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
                  SDK 类型
                </label>
                <Select
                  value={provider.type}
                  onValueChange={(value) => handleProviderChange(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择 SDK 类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {SDK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {provider.type === 'openai' && (
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
              )}

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