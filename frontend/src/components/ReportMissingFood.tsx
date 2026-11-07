import { useState } from 'react';
import { foodApi } from '../apis/foodApi';
import { getErrorMessage } from '../constants/errorMessages';
import type { FoodRequestResponse } from '../types/meal';
import { Button } from './Button';

interface Props {
  name: string; // what the user searched for (or what the AI saw)
}

// Same rule as the backend (CreateFoodRequest): letters with accents, digits, spaces, a little punctuation
const VALID_NAME = /^[\p{L}\p{M}\p{N} ,.'()/-]{2,60}$/u;

const RESULT_TEXT: Record<FoodRequestResponse['result'], string> = {
  RECORDED: 'Đã ghi nhận. Món sẽ được thêm khi có số liệu từ nguồn tin cậy.',
  ALREADY_REPORTED: 'Bạn đã báo món này rồi.',
  FOOD_EXISTS: 'Món này đã có trong danh sách dưới tên khác, hãy xem gợi ý ở trên.',
};

// "Báo thiếu món": only the name is sent. Calories are never taken from users or guessed by the AI;
// the food is added later, by migration, from a cited source. The parent keys this by the search,
// so a new search starts with a fresh button.
export function ReportMissingFood({ name }: Props) {
  const [result, setResult] = useState<FoodRequestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!VALID_NAME.test(trimmed)) return null; // nothing sensible to report

  async function send() {
    setBusy(true);
    setError(null);
    try {
      setResult(await foodApi.reportMissing(trimmed));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <p className="text-sm text-ink-soft" role="status">
        {RESULT_TEXT[result.result]}
        {result.result === 'RECORDED' && ` Hôm nay bạn còn ${result.remainingToday} lần báo.`}
        {result.result !== 'FOOD_EXISTS' && ' Trong lúc chờ, bạn có thể chọn món gần giống.'}
      </p>
    );
  }

  return (
    <div className="grid gap-1">
      <div>
        <Button variant="secondary" size="sm" onClick={() => void send()} disabled={busy}>
          {busy ? 'Đang gửi…' : `Báo thiếu món “${trimmed}”`}
        </Button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
