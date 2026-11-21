import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { allergenApi } from '../../apis/allergenApi';
import { DIET_CHOICES, EXPERIENCE_CHOICES, GOAL_CHOICES, SUGGESTION_CHOICES, TRAINING_TYPE_CHOICES } from '../../constants/profile';
import type { Profile } from '../../types/profile';

function labelOf<T extends string>(choices: { value: T; label: string }[], value: T | null): string | null {
  return choices.find((c) => c.value === value)?.label ?? null;
}

// Tab "Tổng quan": the coach answers in five lines, with a link to edit them
export function CoachSummaryCard({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    allergenApi.list()
      .then((list) => { if (!ignore) setNames(Object.fromEntries(list.map((a) => [a.code, a.name]))); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  const training = [labelOf(TRAINING_TYPE_CHOICES, profile.trainingType), labelOf(EXPERIENCE_CHOICES, profile.trainingExperience)]
    .filter(Boolean).join(', ');
  const diet = labelOf(DIET_CHOICES, profile.dietType);
  const rows: [string, string | null][] = [
    ['Mục tiêu', labelOf(GOAL_CHOICES, profile.goal)],
    ['Tập luyện', training || null],
    ['Chế độ ăn', diet && `${diet} · gợi ý ${labelOf(SUGGESTION_CHOICES, profile.suggestionStyle)?.toLocaleLowerCase('vi')}`],
    ['Dị ứng', profile.allergens.length ? profile.allergens.map((c) => names[c] ?? c).join(', ') : 'Không có'],
    ['Món không ăn', profile.excludedFoods.length ? profile.excludedFoods.map((f) => f.name).join(', ') : 'Không có'],
  ];

  return (
    <section className="grid min-w-0 content-start rounded-card bg-surface p-5 text-ink md:p-6" aria-labelledby="coach-summary">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="coach-summary" className="text-lg font-semibold">Hồ sơ huấn luyện</h2>
        <button type="button" onClick={onEdit}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-link hover:underline">
          Sửa <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <dl className="grid">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-t border-line py-2.5 text-sm">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className={`text-right ${value ? '' : 'text-warn'}`}>{value ?? 'Chưa trả lời'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-muted">MBotFit và gợi ý món dùng đúng các thông tin này.</p>
    </section>
  );
}
