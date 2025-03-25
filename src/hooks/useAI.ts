import { AIService } from '../utils/ai';

export function useAI() {
  const aiService = AIService.getInstance();

  return {
    sendMessage: aiService.sendMessage.bind(aiService),
    clearHistory: aiService.clearHistory.bind(aiService),
    listModels: aiService.listModels.bind(aiService)
  };
} 