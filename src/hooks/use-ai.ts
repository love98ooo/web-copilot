import { AIService, type AIConfig, type MessagePart } from '../utils/ai';
import { useCallback } from 'react';

export function useAI() {
  const aiService = AIService.getInstance();

  const sendMessage = useCallback(
    async (
      content: string | MessagePart[],
      providerId: string,
      model: string,
      onChunk?: (chunk: string) => void,
      config?: AIConfig
    ) => {
      return aiService.sendMessage(content, providerId, model, onChunk, config);
    },
    []
  );

  return {
    sendMessage,
    clearCurrentSession: aiService.clearCurrentSession.bind(aiService),
    clearAllSessions: aiService.clearAllSessions.bind(aiService),
    getCurrentSession: aiService.getCurrentSession.bind(aiService),
    switchSession: aiService.switchSession.bind(aiService),
    listModels: aiService.listModels.bind(aiService)
  };
}