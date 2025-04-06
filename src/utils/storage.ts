import { storage } from 'wxt/storage';
import type { ChatMessage } from './ai';

// 定义 Provider 类型
export type ProviderType = 'openai' | 'gemini';

// 定义单个 Provider 的配置接口
export interface ProviderConfig {
  id: string;  // provider 的唯一标识
  type: ProviderType;  // provider 类型
  apiKey: string;
  baseUrl: string;
  name: string;  // provider 名称
  models: string[];  // provider 支持的模型列表
}

// 定义选中的 Provider 状态接口
export interface SelectedProviderState {
  providerId: string;  // provider 的唯一标识
  model: string;
}

// 定义配置项的接口
export interface AIConfigStorage {
  version: number;
  providerList: string[];  // provider id 列表
  selectedProvider: SelectedProviderState;
}

// 定义历史记录存储接口
export interface ChatHistories {
  [key: string]: ChatMessage[];  // key 是 provider 的唯一标识
}

// 定义提示词类型
export interface Prompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  tags: string[];
  temperature: number;
  createdAt: number;
  updatedAt: number;
}

// 从环境变量获取默认配置
const getDefaultProviders = (): [string[], Record<string, ProviderConfig>] => {
  console.debug(import.meta.env);
  const providers: Record<string, ProviderConfig> = {};
  const providerList: string[] = [];

  // OpenAI 配置
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    const id = 'openai-default';
    providers[id] = {
      id,
      type: 'openai',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      baseUrl: import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
      name: import.meta.env.VITE_OPENAI_API_NAME || 'OpenAI',
      models: [import.meta.env.VITE_OPENAI_API_MODEL || 'gpt-3.5-turbo']
    };
    providerList.push(id);
  }

  // Gemini 配置
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    const id = 'gemini-default';
    providers[id] = {
      id,
      type: 'gemini',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      baseUrl: '',
      name: import.meta.env.VITE_GEMINI_API_NAME || 'Gemini',
      models: [import.meta.env.VITE_GEMINI_API_MODEL || 'gemini-2.0-flash']
    };
    providerList.push(id);
  }

  // 如果没有配置任何 provider，添加一个空的 OpenAI 配置
  if (providerList.length === 0) {
    const id = 'openai-default';
    providers[id] = {
      id,
      type: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      name: 'OpenAI',
      models: ['gpt-3.5-turbo']
    };
    providerList.push(id);
  }

  return [providerList, providers];
};

// 定义默认配置
const [defaultProviderList, defaultProviders] = getDefaultProviders();
const DEFAULT_CONFIG: AIConfigStorage = {
  version: 3,
  providerList: defaultProviderList,
  selectedProvider: {
    providerId: defaultProviderList[0],
    model: defaultProviders[defaultProviderList[0]].models[0]
  }
};

// 默认提示词库
const DEFAULT_PROMPTS: Record<string, Prompt> = {
  'default-prompt-1': {
    id: 'default-prompt-1',
    name: '翻译助手',
    content: '你是一位专业的翻译专家，精通中英文互译。请将用户输入的文本翻译成目标语言，保持原意的同时追求表达的自然流畅。注意保留专业术语，确保翻译准确无误。',
    description: '用于中英文互译的提示词',
    tags: ['翻译', '语言'],
    temperature: 0.3,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'default-prompt-2': {
    id: 'default-prompt-2',
    name: '代码助手',
    content: '你是一位资深软件工程师，擅长编写高质量、易读、高效的代码。帮助用户解决编程问题，优化代码结构，并提供详细的解释。使用最佳实践和设计模式，考虑代码的可维护性和扩展性。',
    description: '用于编程和代码相关问题',
    tags: ['编程', '代码'],
    temperature: 0.7,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'default-prompt-3': {
    id: 'default-prompt-3',
    name: '内容总结',
    content: '你是一位精通信息提炼与归纳的专家。请对用户提供的文本进行简洁有效的总结，保留核心信息和关键观点，同时去除冗余内容。总结应当：\n1. 抓住文本的主要论点和结论\n2. 保持逻辑清晰，层次分明\n3. 使用简洁的语言表达\n4. 根据内容长度自动调整总结长度，确保覆盖所有要点\n\n如果文本包含多个主题，请分别总结各个主题的要点。',
    description: '用于总结长文本、会议内容或文章的要点',
    tags: ['总结', '精简'],
    temperature: 0.5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// 创建配置存储项
export const aiConfig = storage.defineItem<AIConfigStorage>('local:ai_config', {
  fallback: DEFAULT_CONFIG,
  version: 3
});

// 创建 provider 存储项
export const providers = storage.defineItem<Record<string, ProviderConfig>>('local:providers', {
  fallback: defaultProviders,
  version: 1
});

// 创建历史记录存储项
export const chatHistories = storage.defineItem<ChatHistories>('local:chat_histories', {
  fallback: {},
  version: 1
});

// 创建提示词库存储项
export const promptsLib = storage.defineItem<Record<string, Prompt>>('local:prompts_lib', {
  fallback: DEFAULT_PROMPTS,
  version: 1
});

// 辅助函数：获取配置
export async function getAIConfig(): Promise<AIConfigStorage> {
  const config = await aiConfig.getValue();
  const storedProviders = await providers.getValue();

  // 如果没有配置 provider 或者 providerList 为 undefined，使用环境变量配置
  if (!config.providerList || config.providerList.length === 0) {
    const [defaultProviderList, defaultProviders] = getDefaultProviders();
    if (defaultProviderList.length > 0) {
      config.providerList = defaultProviderList;
      await providers.setValue(defaultProviders);
      config.selectedProvider = {
        providerId: defaultProviderList[0],
        model: defaultProviders[defaultProviderList[0]].models[0]
      };
      await aiConfig.setValue(config);
    } else {
      // 如果没有默认配置，初始化为空数组
      config.providerList = [];
      config.selectedProvider = {
        providerId: '',
        model: ''
      };
      await aiConfig.setValue(config);
    }
  }

  // 确保所有引用的 provider 都存在
  const validProviderList = config.providerList.filter(id => storedProviders[id]);
  if (validProviderList.length !== config.providerList.length) {
    config.providerList = validProviderList;
    if (validProviderList.length > 0 && (!config.selectedProvider.providerId || !storedProviders[config.selectedProvider.providerId])) {
      const firstProvider = storedProviders[validProviderList[0]];
      config.selectedProvider = {
        providerId: firstProvider.id,
        model: firstProvider.models[0]
      };
    }
    await aiConfig.setValue(config);
  }

  return config;
}

// 辅助函数：获取所有 provider 配置
export async function getAllProviders(): Promise<ProviderConfig[]> {
  const config = await getAIConfig();
  const storedProviders = await providers.getValue();
  return config.providerList.filter(id => storedProviders[id]).map(id => storedProviders[id]);
}

// 辅助函数：获取指定 provider 配置
export async function getProvider(id: string): Promise<ProviderConfig | null> {
  const storedProviders = await providers.getValue();
  return storedProviders[id] || null;
}

// 辅助函数：更新 provider 配置
export async function updateProvider(id: string, config: Partial<ProviderConfig>): Promise<void> {
  const storedProviders = await providers.getValue();
  if (storedProviders[id]) {
    storedProviders[id] = {
      ...storedProviders[id],
      ...config
    };
    await providers.setValue(storedProviders);
  }
}

// 辅助函数：添加新的 provider
export async function addProvider(config: Omit<ProviderConfig, 'id'>): Promise<string> {
  const id = `${config.type}-${Date.now()}`;
  const newProvider: ProviderConfig = {
    ...config,
    id
  };

  const storedProviders = await providers.getValue();
  storedProviders[id] = newProvider;
  await providers.setValue(storedProviders);

  const aiconf = await aiConfig.getValue();
  aiconf.providerList.push(id);
  await aiConfig.setValue(aiconf);

  return id;
}

// 辅助函数：删除 provider
export async function removeProvider(id: string): Promise<void> {
  const aiconf = await aiConfig.getValue();
  const storedProviders = await providers.getValue();

  // 从列表中移除
  const index = aiconf.providerList.indexOf(id);
  if (index !== -1) {
    aiconf.providerList.splice(index, 1);
  }

  // 如果删除的是当前选中的 provider，选择第一个可用的
  if (aiconf.selectedProvider.providerId === id && aiconf.providerList.length > 0) {
    const firstProvider = storedProviders[aiconf.providerList[0]];
    aiconf.selectedProvider = {
      providerId: firstProvider.id,
      model: firstProvider.models[0]
    };
  }

  // 删除 provider 配置
  delete storedProviders[id];

  await aiConfig.setValue(aiconf);
  await providers.setValue(storedProviders);
}

// 辅助函数：更新选中的 provider
export async function updateSelectedProvider(selected: SelectedProviderState): Promise<void> {
  const config = await getAIConfig();
  config.selectedProvider = selected;
  await aiConfig.setValue(config);
}

// 辅助函数：重置配置
export async function resetAIConfig(): Promise<void> {
  const [defaultProviderList, defaultProviders] = getDefaultProviders();
  await aiConfig.setValue({
    version: 3,
    providerList: defaultProviderList,
    selectedProvider: {
      providerId: defaultProviderList[0],
      model: defaultProviders[defaultProviderList[0]].models[0]
    }
  });
  await providers.setValue(defaultProviders);
}

// 监听配置变化
export function watchAIConfig(callback: (newConfig: AIConfigStorage, oldConfig: AIConfigStorage | null) => void) {
  return aiConfig.watch(callback);
}

// 辅助函数：获取历史记录
export async function getChatHistory(providerId: string): Promise<ChatMessage[]> {
  const histories = await chatHistories.getValue();
  return histories[providerId] || [];
}

// 辅助函数：更新历史记录
export async function updateChatHistory(providerId: string, messages: ChatMessage[]): Promise<void> {
  const histories = await chatHistories.getValue();
  histories[providerId] = messages;
  await chatHistories.setValue(histories);
}

// 辅助函数：清除历史记录
export async function clearChatHistory(providerId: string): Promise<void> {
  const histories = await chatHistories.getValue();
  delete histories[providerId];
  await chatHistories.setValue(histories);
}

// 获取所有提示词
export async function getAllPrompts(): Promise<Prompt[]> {
  const storedPrompts = await promptsLib.getValue();
  return Object.values(storedPrompts).sort((a, b) => b.updatedAt - a.updatedAt);
}

// 获取提示词详情
export async function getPrompt(id: string): Promise<Prompt | null> {
  const storedPrompts = await promptsLib.getValue();
  return storedPrompts[id] || null;
}

// 添加新提示词
export async function addPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `prompt-${Date.now()}`;
  const timestamp = Date.now();

  const newPrompt: Prompt = {
    ...prompt,
    id,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const storedPrompts = await promptsLib.getValue();
  storedPrompts[id] = newPrompt;
  await promptsLib.setValue(storedPrompts);

  return id;
}

// 更新提示词
export async function updatePrompt(id: string, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Promise<void> {
  const storedPrompts = await promptsLib.getValue();

  if (storedPrompts[id]) {
    storedPrompts[id] = {
      ...storedPrompts[id],
      ...data,
      updatedAt: Date.now()
    };

    await promptsLib.setValue(storedPrompts);
  }
}

// 删除提示词
export async function removePrompt(id: string): Promise<void> {
  const storedPrompts = await promptsLib.getValue();

  if (storedPrompts[id]) {
    delete storedPrompts[id];
    await promptsLib.setValue(storedPrompts);
  }
}