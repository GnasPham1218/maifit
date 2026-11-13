// Mirrors the backend DTOs in chat/dto and ai/dto
import type { Nutrition, Preparation } from './meal';

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

// One food of a calculation under an answer. Numbers come from the foods table (backend), never from the model.
export interface ChatCalcItem {
  food: string;
  foodId: number | null; // the foods row used; null while preparation is null
  preparation: Preparation | null; // null = the user picks one of the options
  options: Preparation[];
  grams: number;
  estimated: boolean; // the model estimated the grams ("1 bát cơm")
  nutrition: Nutrition | null; // null while preparation is null
}

// PUT /chat/messages/{id}/calculation: only a food and an amount, the server recalculates everything
export interface ChatCalcItemRequest {
  food: string;
  preparation: Preparation | null;
  grams: number; // 1..2000
  estimated: boolean;
}

export interface ChatCalculation {
  items: ChatCalcItem[];
  total: Nutrition | null; // null until every item has a preparation
}

export interface ChatReply {
  conversationId: number;
  messageId: number; // the saved reply, to pick a preparation in its calculation
  outcome: ChatOutcome;
  answer: string | null; // only when outcome is ANSWERED; the UI has a fixed text for the others
  sources: ChatSource[];
  calculation: ChatCalculation | null;
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
  calculation: ChatCalculation | null;
  createdAt: string;
}

export interface ChatQuota {
  limit: number; // per day, depends on the plan
  remainingToday: number;
}
