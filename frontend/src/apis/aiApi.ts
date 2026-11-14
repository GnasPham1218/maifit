import type { AiQuotas } from '../types/ai';
import { api } from './client';

export const aiApi = {
  // Calls left today for every AI feature (read only, uses no call)
  quota: () => api<AiQuotas>('/ai/quota'),
};
