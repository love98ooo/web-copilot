import { storage } from 'wxt/storage';

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

// 定义默认配置
const DEFAULT_CONFIG: AIConfig = {
  version: 2,
  providers: [{
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    name: 'OpenAI'
  }],
  selectedProvider: {
    providerIndex: 0,
    model: 'gpt-3.5-turbo'
  }
};

// 创建配置存储项
export const aiConfig = storage.defineItem<AIConfig>('local:ai_config', {
  fallback: DEFAULT_CONFIG,
  version: 2
});

// 辅助函数：获取配置
export async function getAIConfig(): Promise<AIConfig> {
  return await aiConfig.getValue();
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