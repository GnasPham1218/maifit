import { useEffect, useState } from 'react';
import { aiApi } from '../../apis/aiApi';
import { FORMULA_LABELS, MACRO_SPLIT_LABELS } from '../../constants/profile';
import type { AiQuota, AiQuotas } from '../../types/ai';
import type { EnergyTargets, Goal } from '../../types/profile';
import { formatNumber } from '../../utils/number';
import { Alert } from '../Alert';

const GOAL_SHORT: Record<Goal, string> = { LOSE: 'giảm cân', MAINTAIN: 'giữ cân', GAIN: 'tăng cân' };

// Phones: the three numbers share one card. md+: each number is its own card (the wrapper is display: contents).
const STAT = 'grid min-w-0 content-start gap-1 md:rounded-card md:p-6';

function Stat({ label, value, unit, accent = false }: { label: string; value: number; unit: string; accent?: boolean }) {
  // The target is the number that matters most: an accent card from md
  const tone = accent ? 'md:bg-accent md:text-on-accent' : 'md:bg-surface';
  const soft = accent ? 'text-muted md:text-on-accent/80' : 'text-muted';
  return (
    <div className={`${STAT} ${tone}`}>
      <p className={`text-xs md:text-sm md:whitespace-nowrap ${soft}`}>{label}</p>
      <p className="font-display text-3xl leading-none font-bold tabular-nums md:text-5xl">{formatNumber(value)}</p>
      <p className={`text-xs md:text-sm ${soft}`}>{unit}</p>
    </div>
  );
}

function QuotaBar({ label, quota }: { label: string; quota: AiQuota }) {
  const share = quota.limit > 0 ? quota.remainingToday / quota.limit : 0;
  return (
    <div className="grid gap-1.5">
      <p className="flex justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="text-muted tabular-nums">còn {quota.remainingToday}/{quota.limit}</span>
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-surface/70">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
    </div>
  );
}

// BMR, TDEE and the target. Row of three cards from md, one card on phones.
export function EnergyStats({ energy, goal }: { energy: EnergyTargets; goal: Goal }) {
  const custom = energy.targetKcal !== energy.suggestedKcal;
  return (
    <div className="grid gap-4">
      {energy.deficitSkippedForMinor && (
        <Alert type="info">
          Bạn dưới 18 tuổi nên MAIFit không trừ calo để giảm cân: cơ thể đang phát triển cần đủ năng lượng. Mục tiêu
          được đặt bằng mức duy trì.
        </Alert>
      )}
      <div className="grid grid-cols-3 gap-3 rounded-card bg-surface p-5 text-ink md:gap-4 md:bg-transparent md:p-0">
        <Stat label="Năng lượng nghỉ (BMR)" value={energy.bmr} unit="kcal mỗi ngày" />
        <Stat label="Tiêu hao cả ngày (TDEE)" value={energy.tdee} unit="kcal mỗi ngày" />
        <Stat label="Mục tiêu ăn" value={energy.targetKcal} accent
          unit={custom ? `kcal, tự đặt (gợi ý ${formatNumber(energy.suggestedKcal)})` : `kcal, ${GOAL_SHORT[goal]}`} />
      </div>
    </div>
  );
}

// Today's AI calls left. refreshKey: bumped after paying (the limits grow).
export function AiQuotaCard({ refreshKey }: { refreshKey: number }) {
  const [quotas, setQuotas] = useState<AiQuotas | null>(null);

  useEffect(() => {
    let ignore = false;
    aiApi
      .quota()
      .then((q) => {
        if (!ignore) setQuotas(q);
      })
      .catch(() => {}); // the card just stays empty; the limits are enforced by the server anyway
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <section className="grid min-w-0 content-between gap-4 rounded-card bg-soft p-5 text-ink md:p-6" aria-labelledby="quota-title">
      <h2 id="quota-title" className="text-sm text-muted">Lượt AI hôm nay</h2>
      {quotas ? (
        <div className="grid gap-3.5">
          <QuotaBar label="Ảnh món ăn" quota={quotas.foodVision} />
          <QuotaBar label="MBotFit" quota={quotas.chat} />
        </div>
      ) : (
        <p className="text-sm text-muted">Đang tải…</p>
      )}
    </section>
  );
}

// Grams per day for each macro split, under the body form (details: closed by default)
export function MacroDetails({ energy }: { energy: EnergyTargets }) {
  return (
    <details className="mt-4 border-t border-line pt-3 text-sm">
      <summary className="cursor-pointer text-muted">Chia đạm, béo, carb theo mục tiêu</summary>
      <table className="mt-3 w-full border-collapse [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:text-left [&_th]:font-medium">
        <thead>
          <tr><th>Tỉ lệ</th><th>Đạm</th><th>Béo</th><th>Carb</th></tr>
        </thead>
        <tbody>
          {energy.macros.map((m) => (
            <tr key={m.split}>
              <td>{MACRO_SPLIT_LABELS[m.split]}</td>
              <td>{m.proteinG} g</td>
              <td>{m.fatG} g</td>
              <td>{m.carbG} g</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Công thức BMR: {FORMULA_LABELS[energy.formula]}. Đây là ước tính, chỉ mang tính tham khảo.</p>
    </details>
  );
}
