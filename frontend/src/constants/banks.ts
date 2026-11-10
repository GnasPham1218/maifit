// Bank identification numbers (BIN, Napas) of common Vietnamese banks, to name the receiving bank
// next to the QR code. An unknown BIN is shown as the number itself.
const BANKS: Record<string, string> = {
  '970403': 'Sacombank',
  '970405': 'Agribank',
  '970407': 'Techcombank',
  '970415': 'VietinBank',
  '970416': 'ACB',
  '970418': 'BIDV',
  '970422': 'MB Bank',
  '970423': 'TPBank',
  '970432': 'VPBank',
  '970436': 'Vietcombank',
  '970448': 'OCB',
};

export function bankName(bin: string | null): string {
  if (!bin) return '—';
  return BANKS[bin] ?? `Mã ngân hàng ${bin}`;
}
