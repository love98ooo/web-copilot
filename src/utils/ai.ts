import OpenAI from "openai";
import { createUserContent, GoogleGenAI } from "@google/genai";
import type { ProviderConfig } from "./storage";
import { getProvider } from "./storage";
import { chatHistoryService, type ChatSession } from "./history";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | MessagePart[];
}

export interface MessagePart {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
  page_content?: {
    url: string;
    title: string;
    content: string;
    metadata?: {
      description?: string;
      keywords?: string[];
      author?: string;
      publishedTime?: string;
    };
  };
}

export interface Message {
  id: string;
  content: string | MessagePart[];
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
  private currentSession: ChatSession | null = null;

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
        dangerouslyAllowBrowser: true,
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
      if (provider.type === "openai") {
        const openai = this.getOpenAIClient(provider);
        const response = await openai.models.list();
        return response.data.map((model) => model.id).sort();
      } else if (provider.type === "gemini") {
        // Gemini 的可用模型列表
        return [
          "gemini-2.5-pro-exp-03-25", // 最强大的思维模型，最高的响应准确度
          "gemini-2.0-flash", // 新一代多模态模型，支持代码和图像生成
          "gemini-2.0-flash-lite", // 优化成本和延迟的 2.0 Flash 模型
          "gemini-1.5-flash", // 快速且通用的性能
          "gemini-1.5-flash-8b", // 适用于高容量和低智能任务
          "gemini-1.5-pro", // 适用于需要更多智能的复杂推理任务
          "gemini-embedding-exp", // 用于测量文本字符串相关性
        ];
      }
      return [];
    } catch (error: any) {
      console.error("获取模型列表失败:", error);
      throw this.formatError(error);
    }
  }

  private formatError(error: any): AIError {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      return {
        message: `API 错误: ${apiError.message}`,
        code: apiError.code,
        type: apiError.type,
      };
    }

    if (error.message?.includes("API Key")) {
      return {
        message: "API Key 未配置或无效。请在扩展设置中设置正确的 API Key。",
        type: "auth_error",
      };
    }

    if (
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ETIMEDOUT")
    ) {
      return {
        message: "连接服务器失败。请检查你的网络连接或代理设置。",
        type: "connection_error",
      };
    }

    return {
      message: `发生错误: ${error.message || "未知错误"}`,
      type: "unknown_error",
    };
  }

  public async sendMessage(
    content: string | MessagePart[],
    providerId: string,
    model: string,
    onChunk?: (chunk: string) => void
  ): Promise<Message> {
    try {
      const provider = await getProvider(providerId);
      if (!provider) {
        throw new Error("Provider not found");
      }

      // 如果没有当前会话，创建新会话
      if (!this.currentSession) {
        this.currentSession = await chatHistoryService.createSession(
          providerId,
          model
        );
        console.debug("创建新会话: ", this.currentSession.id);
      } else {
        // 更新当前会话的 provider 和 model
        await chatHistoryService.updateSession(this.currentSession.id, {
          providerId,
          model,
        });
        console.debug("更新会话: ", this.currentSession.id);
      }

      // 确保加载最新的会话消息
      const updatedSession = await chatHistoryService.getSession(
        this.currentSession.id
      );
      if (!updatedSession) {
        throw new Error("Session not found");
      }
      this.currentSession = updatedSession;

      // 创建用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        isUser: true,
      };

      // 添加用户消息到会话
      await chatHistoryService.addMessage(this.currentSession.id, userMessage);

      // 重新获取更新后的会话以确保消息列表是最新的
      this.currentSession = await chatHistoryService.getSession(
        this.currentSession.id
      );
      if (!this.currentSession) {
        throw new Error("Session not found after adding message");
      }

      let aiResponse = "";

      if (provider.type === "openai") {
        const openai = this.getOpenAIClient(provider);
        const stream = await openai.chat.completions.create({
          messages: this.currentSession.messages.map((msg) => {
            if (Array.isArray(msg.content)) {
              return {
                role: msg.isUser ? "user" : "assistant",
                content: msg.content
                  .map((part) => {
                    if (part.type === "text") {
                      return {
                        type: "text",
                        text: part.text || "",
                      } as const;
                    } else if (part.type === "page_content") {
                      return {
                        type: "text",
                        text: `参考页面信息：
标题: ${part.page_content?.title}
URL: ${part.page_content?.url}
内容: ${part.page_content?.content}
${
  part.page_content?.metadata?.description
    ? `描述: ${part.page_content.metadata.description}`
    : ""
}
${
  part.page_content?.metadata?.keywords
    ? `关键词: ${part.page_content.metadata.keywords.join(", ")}`
    : ""
}`,
                      } as const;
                    }
                    return null;
                  })
                  .filter(
                    (part): part is { type: "text"; text: string } =>
                      part !== null
                  ),
              };
            }
            return {
              role: msg.isUser ? "user" : "assistant",
              content: msg.content,
            };
          }),
          model: model,
          stream: true,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            aiResponse += content;
            onChunk?.(content);
          }
        }
      } else if (provider.type === "gemini") {
        const genai = this.getGeminiClient(provider);
        // 将历史消息转换为 Gemini 格式
        const result = await genai.models.generateContentStream({
          model: model,
          contents: this.currentSession.messages.map((msg) => {
            if (Array.isArray(msg.content)) {
              return msg.content
                .map((part) => {
                  if (part.type === "text") {
                    return { text: part.text || "" };
                  } else if (part.type === "page_content") {
                    return {
                      text: `参考页面信息：
标题: ${part.page_content?.title}
URL: ${part.page_content?.url}
内容: ${part.page_content?.content}
${
  part.page_content?.metadata?.description
    ? `描述: ${part.page_content.metadata.description}`
    : ""
}
${
  part.page_content?.metadata?.keywords
    ? `关键词: ${part.page_content.metadata.keywords.join(", ")}`
    : ""
}`,
                    };
                  }
                  return null;
                })
                .filter((part) => part !== null)
            }
            return [{ text: msg.content as string }]
          })
        });

        for await (const chunk of result) {
          const text = chunk.text || "";
          if (text) {
            aiResponse += text;
            onChunk?.(text);
          }
        }
      }

      // 创建 AI 响应消息
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: aiResponse,
        isUser: false,
      };

      // 添加 AI 响应到会话
      await chatHistoryService.addMessage(
        this.currentSession.id,
        assistantMessage
      );

      // 返回完整的消息对象
      return assistantMessage;
    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw this.formatError(error);
    }
  }

  /**
   * 获取当前会话
   */
  public getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * 切换到指定会话
   */
  public async switchSession(sessionId: string | undefined): Promise<ChatSession | null> {
    if (!sessionId) {
      this.currentSession = null;
      return null;
    }
    this.currentSession = await chatHistoryService.getSession(sessionId);
    return this.currentSession;
  }

  /**
   * 清除当前会话
   */
  public async clearCurrentSession(): Promise<void> {
    if (this.currentSession) {
      await chatHistoryService.deleteSession(this.currentSession.id);
      this.currentSession = null;
    }
  }

  /**
   * 清除所有会话
   */
  public async clearAllSessions(): Promise<void> {
    await chatHistoryService.clearAllSessions();
    this.currentSession = null;
  }
}

export const aiService = AIService.getInstance();
