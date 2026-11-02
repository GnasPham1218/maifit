import { FORMULA_LABELS, MACRO_SPLIT_LABELS } from '../constants/profile';
import type { EnergyTargets } from '../types/profile';
import { Alert } from './Alert';
import { Card } from './Card';

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
      <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div className="grid gap-0.5 rounded-lg bg-bg p-3">
          <span className="text-sm text-muted">Mục tiêu</span>
          <strong className="text-xl">{energy.targetKcal} kcal</strong>
          {custom && <span className="text-xs text-muted">Gợi ý: {energy.suggestedKcal} kcal</span>}
        </div>
        <div className="grid gap-0.5 rounded-lg bg-bg p-3">
          <span className="text-sm text-muted">TDEE (duy trì)</span>
          <strong className="text-xl">{energy.tdee} kcal</strong>
        </div>
        <div className="grid gap-0.5 rounded-lg bg-bg p-3">
          <span className="text-sm text-muted">BMR</span>
          <strong className="text-xl">{energy.bmr} kcal</strong>
        </div>
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
