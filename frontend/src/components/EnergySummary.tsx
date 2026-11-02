import { FORMULA_LABELS, MACRO_SPLIT_LABELS } from '../constants/profile';
import type { EnergyTargets } from '../types/profile';
import { Alert } from './Alert';
import { Card } from './Card';
import { StatTile } from './StatTile';

export function EnergySummary({ energy }: { energy: EnergyTargets }) {
  const custom = energy.targetKcal !== energy.suggestedKcal;
  return (
    <Card title="Mục tiêu mỗi ngày">
      {energy.deficitSkippedForMinor && (
        <Alert type="info">
          Bạn dưới 18 tuổi nên MAIFit không trừ calo để giảm cân: cơ thể đang phát triển cần đủ năng lượng. Mục tiêu
          được đặt bằng mức duy trì.
        </Alert>
      )}
      <div className="mb-2 grid gap-3 sm:grid-cols-3">
        <StatTile tone="sky" label="Mục tiêu" value={energy.targetKcal} unit="kcal"
          hint={custom ? `Gợi ý: ${energy.suggestedKcal} kcal` : undefined} />
        <StatTile tone="lime" label="TDEE (duy trì)" value={energy.tdee} unit="kcal" />
        <StatTile tone="peach" label="BMR" value={energy.bmr} unit="kcal" />
      </div>

      <table className="mt-4 w-full border-collapse text-sm [&_td]:border-b [&_td]:border-line [&_td]:p-2 [&_th]:border-b [&_th]:border-line [&_th]:p-2 [&_th]:text-left">
        <thead>
          <tr>
            <th>Tỉ lệ (đạm/béo/carb)</th>
            <th>Protein</th>
            <th>Chất béo</th>
            <th>Carb</th>
          </tr>
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
      <p className="text-sm text-muted">
        Công thức BMR: {FORMULA_LABELS[energy.formula]}. Đây là ước tính, chỉ mang tính tham khảo.
      </p>
    </Card>
  );
}
