import { AIService } from '../services/ai';

export function useAIService() {
  const aiService = AIService.getInstance();

  return {
    sendMessage: aiService.sendMessage.bind(aiService),
    clearHistory: aiService.clearHistory.bind(aiService)
  };
}