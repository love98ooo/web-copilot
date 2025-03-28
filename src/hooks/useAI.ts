import { AIService } from '../utils/ai';

export function useAI() {
  const aiService = AIService.getInstance();

  return {
    sendMessage: aiService.sendMessage.bind(aiService),
    clearCurrentSession: aiService.clearCurrentSession.bind(aiService),
    clearAllSessions: aiService.clearAllSessions.bind(aiService),
    getCurrentSession: aiService.getCurrentSession.bind(aiService),
    switchSession: aiService.switchSession.bind(aiService),
    listModels: aiService.listModels.bind(aiService)
  };
} 