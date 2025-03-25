// 新建类型定义文件
export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  pending?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
} 