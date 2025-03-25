import OpenAI from 'openai';
import type { ChatMessage } from '../types';

// 创建 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export class AIService {
  private static instance: AIService;
  private messageHistory: ChatMessage[] = [];

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async sendMessage(message: string): Promise<string> {
    try {
      // 添加用户消息到历史记录
      this.messageHistory.push({
        role: 'user',
        content: message
      });

      const completion = await openai.chat.completions.create({
        messages: this.messageHistory,
        model: 'gpt-4o',
      });

      const aiResponse = completion.choices[0]?.message?.content;

      if (aiResponse) {
        // 添加 AI 响应到历史记录
        this.messageHistory.push({
          role: 'assistant',
          content: aiResponse
        });
        return aiResponse;
      }

      throw new Error('No response from AI');
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

export const aiService = AIService.getInstance();