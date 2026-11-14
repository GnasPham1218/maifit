import type { BodyCheckin } from '../types/profile';
import { formatNumber } from '../utils/number';

interface Props {
  checkins: BodyCheckin[]; // oldest first (as returned by the API)
}

const WIDTH = 600;
const HEIGHT = 120;
const PAD = 10;

// Tiny hand-drawn SVG line: enough for a 30-day trend, no chart library needed yet
export function WeightSparkline({ checkins }: Props) {
  if (checkins.length < 2) {
    return <p className="text-sm text-muted">Cần ít nhất 2 lần ghi cân nặng để vẽ xu hướng.</p>;
  }

  const times = checkins.map((c) => new Date(c.checkedAt).getTime());
  const weights = checkins.map((c) => c.weightKg);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const wMin = Math.min(...weights);
  const wMax = Math.max(...weights);
  const tSpan = tMax - tMin || 1;
  const wSpan = wMax - wMin || 1; // flat line when every weight is equal

  const points = checkins.map((_, i) => {
    const x = PAD + ((times[i] - tMin) / tSpan) * (WIDTH - 2 * PAD);
    const y = HEIGHT - PAD - ((weights[i] - wMin) / wSpan) * (HEIGHT - 2 * PAD);
    return [x, y] as const;
  });
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full text-accent"
        role="img"
        aria-label={`Cân nặng từ ${formatNumber(weights[0])} kg đến ${formatNumber(weights[weights.length - 1])} kg`}
      >
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={lastX} cy={lastY} r={5} className="fill-ink" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>Thấp nhất {formatNumber(wMin)} kg</span>
        <span>Cao nhất {formatNumber(wMax)} kg</span>
      </div>
    </div>
  );
}
