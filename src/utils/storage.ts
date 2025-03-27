import { storage } from 'wxt/storage';
import type { ChatMessage } from './ai';

// 定义单个 Provider 的配置接口
export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  name?: string;  // provider 名称，用于显示
}

// 定义选中的 Provider 状态接口
export interface SelectedProviderState {
  providerIndex: number;
  model: string;
}

// 定义配置项的接口
export interface AIConfig {
  version: number;
  providers: ProviderConfig[];
  selectedProvider: SelectedProviderState;
}

// 定义历史记录存储接口
export interface ChatHistories {
  [key: string]: ChatMessage[];  // key 是 provider 的唯一标识
}

// 从环境变量获取默认配置
const getDefaultProvider = (): ProviderConfig => ({
  apiKey: import.meta.env.OPENAI_API_KEY || '',
  baseUrl: import.meta.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
  model: import.meta.env.OPENAI_API_MODEL || 'gpt-3.5-turbo',
  name: 'OpenAI'
});

// 定义默认配置
const DEFAULT_CONFIG: AIConfig = {
  version: 2,
  providers: [getDefaultProvider()],
  selectedProvider: {
    providerIndex: 0,
    model: import.meta.env.OPENAI_API_MODEL || 'gpt-3.5-turbo'
  }
};

// 创建配置存储项
export const aiConfig = storage.defineItem<AIConfig>('local:ai_config', {
  fallback: DEFAULT_CONFIG,
  version: 2
});

// 创建历史记录存储项
export const chatHistories = storage.defineItem<ChatHistories>('local:chat_histories', {
  fallback: {},
  version: 1
});

// 辅助函数：获取配置
export async function getAIConfig(): Promise<AIConfig> {
  const config = await aiConfig.getValue();

  // 如果没有配置 provider，使用环境变量配置
  if (config.providers.length === 0 || !config.providers[0].apiKey) {
    const defaultProvider = getDefaultProvider();
    if (defaultProvider.apiKey) {
      config.providers = [defaultProvider];
      config.selectedProvider = {
        providerIndex: 0,
        model: defaultProvider.model
      };
      await aiConfig.setValue(config);
    }
  }

  return config;
}

// 辅助函数：更新配置
export async function updateAIConfig(config: Partial<AIConfig>): Promise<void> {
  console.debug('updateAIConfig', config);
  const currentConfig = await getAIConfig();
  await aiConfig.setValue({
    ...currentConfig,
    ...config
  });
}

// 辅助函数：更新指定 provider 的配置
export async function updateProvider(index: number, provider: Partial<ProviderConfig>): Promise<void> {
  const config = await getAIConfig();
  config.providers[index] = {
    ...config.providers[index],
    ...provider
  };
  await aiConfig.setValue(config);
}

// 辅助函数：添加新的 provider
export async function addProvider(provider: ProviderConfig): Promise<void> {
  const config = await getAIConfig();
  config.providers.push(provider);
  await aiConfig.setValue(config);
}

// 辅助函数：删除 provider
export async function removeProvider(index: number): Promise<void> {
  const config = await getAIConfig();
  if (config.providers.length > 1) {  // 确保至少保留一个 provider
    config.providers.splice(index, 1);
    // 如果删除的是当前选中的 provider 或之前的 provider
    if (config.selectedProvider.providerIndex >= index) {
      config.selectedProvider.providerIndex = Math.max(0, config.selectedProvider.providerIndex - 1);
    }
    await aiConfig.setValue(config);
  }
}

// 辅助函数：更新选中的 provider
export async function updateSelectedProvider(selectedProvider: SelectedProviderState): Promise<void> {
  const config = await getAIConfig();
  config.selectedProvider = selectedProvider;
  await aiConfig.setValue(config);
}

// 辅助函数：重置配置
export async function resetAIConfig(): Promise<void> {
  await aiConfig.setValue(DEFAULT_CONFIG);
}

// 监听配置变化
export function watchAIConfig(callback: (newConfig: AIConfig, oldConfig: AIConfig | null) => void) {
  return aiConfig.watch(callback);
}

// 辅助函数：获取历史记录
export async function getChatHistory(providerKey: string): Promise<ChatMessage[]> {
  const histories = await chatHistories.getValue();
  return histories[providerKey] || [];
}

// 辅助函数：更新历史记录
export async function updateChatHistory(providerKey: string, messages: ChatMessage[]): Promise<void> {
  const histories = await chatHistories.getValue();
  histories[providerKey] = messages;
  await chatHistories.setValue(histories);
}

// 辅助函数：清除历史记录
export async function clearChatHistory(providerKey: string): Promise<void> {
  const histories = await chatHistories.getValue();
  delete histories[providerKey];
  await chatHistories.setValue(histories);
}