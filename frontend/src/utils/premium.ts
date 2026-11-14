import { formatNumber } from './number';

// 39000 -> "39.000đ"
export const formatVnd = (amount: number) => `${formatNumber(amount)}đ`;

// 2026-12-10T05:00:00Z -> "10/12/2026" (Vietnam time)
export const formatDateVn = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
