// Mirrors ai/dto in the backend
export interface AiQuota {
  limit: number; // calls allowed today, depends on the plan
  remainingToday: number;
}

export interface AiQuotas {
  foodVision: AiQuota; // photo recognition
  chat: AiQuota; // MBotFit
}
