import { storage } from 'wxt/storage';

// 定义配置项的接口
interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// 定义默认配置
const DEFAULT_CONFIG: AIConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o'
};

// 创建配置存储项
export const aiConfig = storage.defineItem<AIConfig>('local:ai_config', {
  fallback: DEFAULT_CONFIG,
  version: 1
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

// 辅助函数：重置配置
export async function resetAIConfig(): Promise<void> {
  await aiConfig.setValue(DEFAULT_CONFIG);
}

// 监听配置变化
export function watchAIConfig(callback: (newConfig: AIConfig, oldConfig: AIConfig | null) => void) {
  return aiConfig.watch(callback);
}