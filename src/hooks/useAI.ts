import { AIService } from '../utils/ai';

export function useAI() {
  const aiService = AIService.getInstance();

  return {
    sendMessage: (
      content: string | MessagePart[],
      providerId: string,
      model: string,
      onChunk?: (chunk: string) => void
    ) => aiService.sendMessage(content, providerId, model, onChunk),
    clearCurrentSession: aiService.clearCurrentSession.bind(aiService),
    clearAllSessions: aiService.clearAllSessions.bind(aiService),
    getCurrentSession: aiService.getCurrentSession.bind(aiService),
    switchSession: aiService.switchSession.bind(aiService),
    listModels: aiService.listModels.bind(aiService)
  };
}