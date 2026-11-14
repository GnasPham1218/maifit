import type { ChatAskRequest, ChatCalcItemRequest, ChatCalculation, ChatConversation, ChatMessage, ChatQuota, ChatReply } from '../types/chat';
import { api } from './client';

export const chatApi = {
  // Can take up to ~30 s (retrieval + model). A refusal is a normal 200 reply, see `outcome`.
  ask: (data: ChatAskRequest) => api<ChatReply>('/chat/messages', { method: 'POST', body: data }),

  quota: () => api<ChatQuota>('/chat/quota'),

  // Latest 50, most recently used first
  conversations: () => api<ChatConversation[]>('/chat/conversations'),

  // Latest 200, oldest first. Another user's id answers 404.
  messages: (conversationId: number) => api<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`),

  // The corrected list under an answer (preparation, food, grams, remove, add). The backend recalculates
  // from the foods table (no AI call, no quota). null = the list is empty, the calculation is gone
  updateCalculation: (messageId: number, items: ChatCalcItemRequest[]) =>
    api<ChatCalculation | null>(`/chat/messages/${messageId}/calculation`, { method: 'PUT', body: { items } }),

  remove: (conversationId: number) => api<null>(`/chat/conversations/${conversationId}`, { method: 'DELETE' }),
};
