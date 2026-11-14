import type { ChatOutcome } from '../types/chat';

// Same value as app.chat.max-question-chars in the backend
export const MAX_QUESTION_CHARS = 500;

// The backend sends no text for a refusal, only its reason: the UI owns the wording
export const OUTCOME_TEXT: Record<Exclude<ChatOutcome, 'ANSWERED'>, string> = {
  NO_INFO: 'Tài liệu của MAIFit chưa có thông tin cho câu này. Bạn thử hỏi cụ thể hơn nhé.',
  MEDICAL: 'Câu hỏi liên quan đến bệnh lý hoặc thuốc. Bạn nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng.',
  OUT_OF_SCOPE: 'Mình chỉ trả lời về dinh dưỡng và tập luyện.',
};

// Shown in an empty conversation. Taken from the evaluation set: known to be answered with sources.
export const SUGGESTED_QUESTIONS = [
  'Người tập tạ nên ăn bao nhiêu protein mỗi ngày?',
  'Creatine có tác dụng gì, uống bao nhiêu?',
  'Nên ăn gì trước và sau buổi tập?',
];

// AI_DAILY_LIMIT is shared with photo recognition, whose global text talks about photos
export function chatLimitText(limit: number | null): string {
  return limit
    ? `Bạn đã dùng hết ${limit} lượt hỏi hôm nay, mai quay lại nhé.`
    : 'Bạn đã dùng hết lượt hỏi hôm nay, mai quay lại nhé.';
}

export const CHAT_DISCLAIMER = 'Thông tin tham khảo, không thay thế tư vấn y tế.';
