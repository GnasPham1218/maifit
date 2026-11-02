import { FORMULA_LABELS, MACRO_SPLIT_LABELS } from '../constants/profile';
import type { EnergyTargets } from '../types/profile';
import { Alert } from './Alert';

export function EnergySummary({ energy }: { energy: EnergyTargets }) {
  const custom = energy.targetKcal !== energy.suggestedKcal;
  return (
    <div className="card">
      <h3 className="card-title">Mục tiêu mỗi ngày</h3>
      {energy.deficitSkippedForMinor && (
        <Alert type="info">
          Bạn dưới 18 tuổi nên MAIFit không trừ calo để giảm cân: cơ thể đang phát triển cần đủ năng lượng. Mục tiêu
          được đặt bằng mức duy trì.
        </Alert>
      )}
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Mục tiêu</span>
          <strong className="stat-value">{energy.targetKcal} kcal</strong>
          {custom && <span className="stat-hint">Gợi ý: {energy.suggestedKcal} kcal</span>}
        </div>
        <div className="stat">
          <span className="stat-label">TDEE (duy trì)</span>
          <strong className="stat-value">{energy.tdee} kcal</strong>
        </div>
        <div className="stat">
          <span className="stat-label">BMR</span>
          <strong className="stat-value">{energy.bmr} kcal</strong>
        </div>
      </div>

      <table className="table">
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
      <p className="muted">
        Công thức BMR: {FORMULA_LABELS[energy.formula]}. Đây là ước tính, chỉ mang tính tham khảo.
      </p>
    </div>
  );
}
