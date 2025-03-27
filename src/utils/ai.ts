import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type { ProviderConfig } from './storage';
import { getChatHistory, updateChatHistory, clearChatHistory, getProvider } from './storage';

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
  private geminiClients: Map<string, GoogleGenAI> = new Map();

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private getClientKey(provider: ProviderConfig): string {
    return `${provider.type}:${provider.apiKey}:${provider.baseUrl}`;
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

  private getGeminiClient(provider: ProviderConfig): GoogleGenAI {
    const clientKey = this.getClientKey(provider);
    let client = this.geminiClients.get(clientKey);

    if (!client) {
      client = new GoogleGenAI({ apiKey: provider.apiKey });
      this.geminiClients.set(clientKey, client);
    }

    return client;
  }

  public async listModels(provider: ProviderConfig): Promise<string[]> {
    try {
      if (provider.type === 'openai') {
        const openai = this.getOpenAIClient(provider);
        const response = await openai.models.list();
        return response.data.map(model => model.id).sort();
      } else if (provider.type === 'gemini') {
        // Gemini 的可用模型列表
        return [
          'gemini-2.5-pro-exp-03-25',  // 最强大的思维模型，最高的响应准确度
          'gemini-2.0-flash',          // 新一代多模态模型，支持代码和图像生成
          'gemini-2.0-flash-lite',     // 优化成本和延迟的 2.0 Flash 模型
          'gemini-1.5-flash',          // 快速且通用的性能
          'gemini-1.5-flash-8b',       // 适用于高容量和低智能任务
          'gemini-1.5-pro',            // 适用于需要更多智能的复杂推理任务
          'gemini-embedding-exp'        // 用于测量文本字符串相关性
        ];
      }
      return [];
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

  public async sendMessage(message: string, providerId: string, model: string): Promise<string> {
    try {
      const provider = await getProvider(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const history = await getChatHistory(providerId);
      const userMessage: ChatMessage = { role: 'user', content: message };
      history.push(userMessage);

      let aiResponse: string | undefined;

      if (provider.type === 'openai') {
        const openai = this.getOpenAIClient(provider);
        const completion = await openai.chat.completions.create({
          messages: history,
          model: model,
          stream: false,
          temperature: 0.7,
        });
        aiResponse = completion.choices[0]?.message?.content || undefined;
      } else if (provider.type === 'gemini') {
        const genai = this.getGeminiClient(provider);
        const response = await genai.models.generateContent({
          model: model,
          contents: message
        });
        aiResponse = response.text || undefined;
      }

      if (aiResponse) {
        const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponse };
        history.push(assistantMessage);
        await updateChatHistory(providerId, history);
        return aiResponse;
      }

      throw new Error('AI 没有返回任何内容');
    } catch (error: any) {
      console.error('AI Service Error:', error);
      throw this.formatError(error);
    }
  }

  public async clearHistory(providerId: string): Promise<void> {
    await clearChatHistory(providerId);
  }
}

export const aiService = AIService.getInstance();