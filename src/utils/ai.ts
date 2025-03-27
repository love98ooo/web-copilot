import OpenAI from 'openai';
import type { ProviderConfig } from './storage';
import { getChatHistory, updateChatHistory, clearChatHistory } from './storage';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  pending?: boolean;
}

export interface AIError {
  message: string;
  code?: string;
  type?: string;
}

export class AIService {
  private static instance: AIService;
  private openaiClients: Map<string, OpenAI> = new Map();

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private getClientKey(provider: ProviderConfig): string {
    return `${provider.apiKey}:${provider.baseUrl}`;
  }

  private getOpenAIClient(provider: ProviderConfig): OpenAI {
    const clientKey = this.getClientKey(provider);
    let client = this.openaiClients.get(clientKey);

    if (!client) {
      client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
        dangerouslyAllowBrowser: true
      });
      this.openaiClients.set(clientKey, client);
    }

    return client;
  }

  public async listModels(provider: ProviderConfig): Promise<string[]> {
    try {
      const openai = this.getOpenAIClient(provider);
      const response = await openai.models.list();

      // 过滤出 GPT 模型
      const gptModels = response.data
        .map(model => model.id)
        .sort();

      return gptModels;
    } catch (error: any) {
      console.error('获取模型列表失败:', error);
      throw this.formatError(error);
    }
  }

  private formatError(error: any): AIError {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      return {
        message: `API 错误: ${apiError.message}`,
        code: apiError.code,
        type: apiError.type
      };
    }

    if (error.message?.includes('API Key')) {
      return {
        message: 'API Key 未配置或无效。请在扩展设置中设置正确的 API Key。',
        type: 'auth_error'
      };
    }

    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT')) {
      return {
        message: '连接服务器失败。请检查你的网络连接或代理设置。',
        type: 'connection_error'
      };
    }

    return {
      message: `发生错误: ${error.message || '未知错误'}`,
      type: 'unknown_error'
    };
  }

  public async sendMessage(message: string, provider: ProviderConfig): Promise<string> {
    try {
      const openai = this.getOpenAIClient(provider);
      const clientKey = this.getClientKey(provider);

      // 从存储中获取历史记录
      const history = await getChatHistory(clientKey);

      // 添加用户消息到历史
      const userMessage: ChatMessage = { role: 'user', content: message };
      history.push(userMessage);

      const completion = await openai.chat.completions.create({
        messages: history,
        model: provider.model,
        stream: false,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content;

      if (aiResponse) {
        // 添加 AI 回复到历史
        const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponse };
        history.push(assistantMessage);

        // 更新存储中的历史记录
        await updateChatHistory(clientKey, history);

        return aiResponse;
      }

      throw new Error('AI 没有返回任何内容');
    } catch (error: any) {
      console.error('AI Service Error:', error);
      throw this.formatError(error);
    }
  }

  public async clearHistory(provider: ProviderConfig): Promise<void> {
    const clientKey = this.getClientKey(provider);
    await clearChatHistory(clientKey);
  }
}

export const aiService = AIService.getInstance();