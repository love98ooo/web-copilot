import { Message } from './ai';

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

class ChatHistoryService {
  private static instance: ChatHistoryService;
  private storageKey = 'chat_sessions';

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
      title: '新对话',  // 可以根据第一条消息自动生成
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId,
      model
    };

    const sessions = await this.getAllSessions();
    sessions.push(session);
    await this.saveSessions(sessions);

    return session;
  }

  /**
   * 获取所有会话，按更新时间倒序排列
   */
  public async getAllSessions(): Promise<ChatSession[]> {
    try {
      const data = await chrome.storage.local.get(this.storageKey);
      const sessions = data[this.storageKey] || [];
      return sessions.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  /**
   * 获取指定会话
   */
  public async getSession(sessionId: string): Promise<ChatSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * 更新会话
   */
  public async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) return null;

    const updatedSession = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now()
    };

    sessions[index] = updatedSession;
    await this.saveSessions(sessions);

    return updatedSession;
  }

  /**
   * 添加消息到会话
   */
  public async addMessage(sessionId: string, message: Message): Promise<ChatSession | null> {
    console.debug('addMessage', sessionId, message);
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = Date.now();

    // 如果是第一条用户消息，用它来生成会话标题
    if (message.isUser && session.messages.length === 1) {
      const title = this.generateTitle(message);
      session.title = title;
    }

    return await this.updateSession(sessionId, session);
  }

  /**
   * 删除会话
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const sessions = await this.getAllSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    
    if (filteredSessions.length === sessions.length) {
      return false;
    }

    await this.saveSessions(filteredSessions);
    return true;
  }

  /**
   * 清空所有会话
   */
  public async clearAllSessions(): Promise<void> {
    await this.saveSessions([]);
  }

  /**
   * 保存会话列表
   */
  private async saveSessions(sessions: ChatSession[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.storageKey]: sessions });
    } catch (error) {
      console.error('保存会话失败:', error);
      throw error;
    }
  }

  /**
   * 根据消息生成会话标题
   */
  private generateTitle(message: Message): string {
    console.debug('generateTitle', message);
    if (typeof message.content === 'string') {
      // 从文本内容中提取标题
      return message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    } else {
      // 从结构化消息中提取标题
      const textPart = message.content.find(part => part.type === 'text');
      if (textPart && textPart.text) {
        return textPart.text.slice(0, 50) + (textPart.text.length > 50 ? '...' : '');
      }
      return '新对话';
    }
  }
}

export const chatHistoryService = ChatHistoryService.getInstance(); 