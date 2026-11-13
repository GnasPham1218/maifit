// Mirrors the backend DTOs in chat/dto and ai/dto

export type ChatOutcome = 'ANSWERED' | 'NO_INFO' | 'MEDICAL' | 'OUT_OF_SCOPE';
export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatSource {
  title: string;
  section: string | null;
  url: string | null;
}

export interface ChatAskRequest {
  conversationId?: number; // missing = start a new conversation
  question: string; // 1..500 characters
}

export interface ChatReply {
  conversationId: number;
  outcome: ChatOutcome;
  answer: string | null; // only when outcome is ANSWERED; the UI has a fixed text for the others
  sources: ChatSource[];
  remainingToday: number | null; // null = this question did not use a call (declined before the AI)
}

export interface ChatConversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string | null; // null for a declined ASSISTANT reply
  outcome: ChatOutcome | null; // null for USER messages
  sources: ChatSource[];
  createdAt: string;
}

export interface ChatQuota {
  limit: number; // per day, depends on the plan
  remainingToday: number;
}
