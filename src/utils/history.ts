import { Message } from './ai';

// 存储键前缀
const STORAGE_PREFIX = {
  SESSIONS_INDEX: '@web-copilot/sessions/index',
  SESSION: '@web-copilot/sessions/data/'
} as const;

export interface ChatSession {
  id: string;                    // 会话唯一标识
  title: string;                 // 会话标题
  messages: Message[];           // 消息列表
  createdAt: number;            // 创建时间戳
  updatedAt: number;            // 最后更新时间戳
  providerId: string;           // 使用的 AI Provider ID
  model: string;                // 使用的模型
  metadata?: {                  // 额外元数据
    [key: string]: any;
  };
}

export interface SessionSummary {
  id: string;                 // 会话唯一标识
  title: string;             // 会话标题
  createdAt: number;         // 创建时间
  updatedAt: number;         // 最后更新时间
  providerId: string;        // AI Provider ID
  model: string;             // 使用的模型
  messageCount: number;      // 消息数量
  lastMessage?: {            // 最后一条消息的摘要
    content: string;         // 消息内容（如果是结构化消息则取第一个文本部分）
    isUser: boolean;         // 是否用户消息
  };
}

interface SessionsIndex {
  sessions: SessionSummary[];  // 会话摘要列表，按更新时间倒序排列
}

class ChatHistoryService {
  private static instance: ChatHistoryService;

  private constructor() {}

  public static getInstance(): ChatHistoryService {
    if (!ChatHistoryService.instance) {
      ChatHistoryService.instance = new ChatHistoryService();
    }
    return ChatHistoryService.instance;
  }

  /**
   * 创建新的聊天会话
   */
  public async createSession(providerId: string, model: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId,
      model
    };

    // 保存会话数据
    await this.saveSession(session);

    // 更新索引
    const index = await this.getSessionsIndex();
    const summary = this.createSessionSummary(session);
    index.sessions.unshift(summary);
    await this.saveSessionsIndex(index);

    return session;
  }

  /**
   * 获取所有会话摘要，按更新时间倒序排列
   */
  public async getSessionSummaries(): Promise<SessionSummary[]> {
    try {
      const index = await this.getSessionsIndex();
      return index.sessions;
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  /**
   * 获取所有会话完整数据，按更新时间倒序排列
   */
  public async getAllSessions(): Promise<ChatSession[]> {
    try {
      const index = await this.getSessionsIndex();
      const sessions = await Promise.all(
        index.sessions.map(summary => this.getSession(summary.id))
      );
      return sessions.filter((s): s is ChatSession => s !== null);
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  /**
   * 获取指定会话
   */
  public async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const data = await chrome.storage.local.get(this.getSessionKey(sessionId));
      return data[this.getSessionKey(sessionId)] || null;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  /**
   * 更新会话
   */
  public async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveSession(updatedSession);

    // 更新索引
    const index = await this.getSessionsIndex();
    const summaryIndex = index.sessions.findIndex(s => s.id === sessionId);
    if (summaryIndex > -1) {
      const updatedSummary = this.createSessionSummary(updatedSession);
      index.sessions.splice(summaryIndex, 1);
      index.sessions.unshift(updatedSummary);
      await this.saveSessionsIndex(index);
    }

    return updatedSession;
  }

  /**
   * 添加消息到会话
   */
  public async addMessage(sessionId: string, message: Message): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = Date.now();

    // 如果是第一条用户消息，用它来生成会话标题
    if (message.isUser && session.messages.length === 1) {
      session.title = this.generateTitle(message);
    }

    // 保存会话并更新索引
    await this.saveSession(session);
    const index = await this.getSessionsIndex();
    const summaryIndex = index.sessions.findIndex(s => s.id === sessionId);
    if (summaryIndex > -1) {
      const updatedSummary = this.createSessionSummary(session);
      index.sessions.splice(summaryIndex, 1);
      index.sessions.unshift(updatedSummary);
      await this.saveSessionsIndex(index);
    }

    return session;
  }

  /**
   * 删除会话
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // 删除会话数据
      await chrome.storage.local.remove(this.getSessionKey(sessionId));

      // 更新索引
      const index = await this.getSessionsIndex();
      const summaryIndex = index.sessions.findIndex(s => s.id === sessionId);
      if (summaryIndex > -1) {
        index.sessions.splice(summaryIndex, 1);
        await this.saveSessionsIndex(index);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }

  /**
   * 清空所有会话
   */
  public async clearAllSessions(): Promise<void> {
    try {
      const index = await this.getSessionsIndex();
      // 删除所有会话数据
      await Promise.all(
        index.sessions.map(summary => chrome.storage.local.remove(this.getSessionKey(summary.id)))
      );
      // 清空索引
      await this.saveSessionsIndex({ sessions: [] });
    } catch (error) {
      console.error('清空会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话索引
   */
  private async getSessionsIndex(): Promise<SessionsIndex> {
    try {
      const data = await chrome.storage.local.get(STORAGE_PREFIX.SESSIONS_INDEX);
      return data[STORAGE_PREFIX.SESSIONS_INDEX] || { sessions: [] };
    } catch (error) {
      console.error('获取会话索引失败:', error);
      return { sessions: [] };
    }
  }

  /**
   * 保存会话索引
   */
  private async saveSessionsIndex(index: SessionsIndex): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_PREFIX.SESSIONS_INDEX]: index });
    } catch (error) {
      console.error('保存会话索引失败:', error);
      throw error;
    }
  }

  /**
   * 创建会话摘要
   */
  private createSessionSummary(session: ChatSession): SessionSummary {
    const lastMessage = session.messages[session.messages.length - 1];
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      providerId: session.providerId,
      model: session.model,
      messageCount: session.messages.length,
      lastMessage: lastMessage ? {
        content: this.getMessageContent(lastMessage),
        isUser: lastMessage.isUser
      } : undefined
    };
  }

  /**
   * 获取消息内容文本
   */
  private getMessageContent(message: Message): string {
    if (typeof message.content === 'string') {
      return message.content.slice(0, 100);
    } else {
      const textPart = message.content.find(part => part.type === 'text');
      return textPart?.text?.slice(0, 100) || '';
    }
  }

  /**
   * 保存单个会话
   */
  private async saveSession(session: ChatSession): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.getSessionKey(session.id)]: session });
    } catch (error) {
      console.error('保存会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话存储键
   */
  private getSessionKey(sessionId: string): string {
    return STORAGE_PREFIX.SESSION + sessionId;
  }

  /**
   * 根据消息生成会话标题
   */
  private generateTitle(message: Message): string {
    if (typeof message.content === 'string') {
      return message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    } else {
      const textPart = message.content.find(part => part.type === 'text');
      if (textPart && textPart.text) {
        return textPart.text.slice(0, 50) + (textPart.text.length > 50 ? '...' : '');
      }
      return '新对话';
    }
  }
}

export const chatHistoryService = ChatHistoryService.getInstance();