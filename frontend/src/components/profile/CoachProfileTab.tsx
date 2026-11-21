import { Info } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { profileApi } from '../../apis/profileApi';
import { getErrorMessage } from '../../constants/errorMessages';
import type { Profile } from '../../types/profile';
import { changesOf, draftFrom, sectionDirty, type CoachDraft, type CoachSection } from '../../utils/coachDraft';
import { formatNumber, optionalNumber } from '../../utils/number';
import { todayVn } from '../../utils/date';
import { ageOn, previewTargets, type PreviewTargets } from '../../utils/tdee';
import { toRequest } from '../../utils/profileRequest';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { BodyFields, DietFields, ExcludedFields, GoalFields, TrainingFields } from './coach/sections';
import { COACH_WHY as WHY, EXCLUDED_ANCHOR, EXCLUDED_SEARCH_ID } from '../../constants/profile';

type Group = 'body' | 'goal' | 'diet';

// Each card saves its own fields; the rest of the profile is sent as saved (PUT replaces everything)
const GROUP_SECTIONS: Record<Group, CoachSection[]> = {
  body: ['body'],
  goal: ['goal', 'training'],
  diet: ['diet', 'excluded'],
};

interface Props {
  profile: Profile;
  onSaved: (p: Profile) => void;
}

// Tab "Hồ sơ huấn luyện": three cards (body, goal + training, food), each with its own Lưu
export function CoachProfileTab({ profile, onSaved }: Props) {
  const [draft, setDraft] = useState<CoachDraft>(() => draftFrom(profile));
  const [saving, setSaving] = useState<Group | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Group, string>>>({});
  const set = (changes: Partial<CoachDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const { hash } = useLocation();

  // "Tránh một món cụ thể" (/about/allergens) lands on #mon-khong-an: go to the block, ready to type
  useEffect(() => {
    if (hash !== `#${EXCLUDED_ANCHOR}`) return;
    document.getElementById(EXCLUDED_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById(EXCLUDED_SEARCH_ID)?.focus({ preventScroll: true });
  }, [hash]);

  const dirty = (g: Group) => GROUP_SECTIONS[g].some((s) => sectionDirty(s, draft, profile));
  const preview = previewFor(profile, draft);

  async function save(g: Group) {
    setSaving(g);
    setErrors((e) => ({ ...e, [g]: undefined }));
    try {
      const saved = await profileApi.save(toRequest(profile, changesOf(GROUP_SECTIONS[g], draft)));
      onSaved(saved);
      // Keep the other cards' unsaved edits; take this card's fields from the server answer
      const fresh = draftFrom(saved);
      setDraft((d) => ({ ...d, ...pick(fresh, g) }));
    } catch (err) {
      setErrors((e) => ({ ...e, [g]: getErrorMessage(err) }));
    } finally {
      setSaving(null);
    }
  }

  function reset(g: Group) {
    setDraft((d) => ({ ...d, ...pick(draftFrom(profile), g) }));
  }

  const footer = (g: Group) => (
    <SaveBar dirty={dirty(g)} saving={saving === g} error={errors[g]} onSave={() => void save(g)} onReset={() => reset(g)} />
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-4 md:gap-5">
        <CoachCard title="Cơ thể và vận động" why={WHY.body} dirty={dirty('body')} footer={footer('body')}>
          <BodyFields draft={draft} set={set} />
          <p className="text-xs text-muted">
            Cân nặng {profile.latestWeightKg != null ? `${formatNumber(profile.latestWeightKg)} kg ` : ''}lấy từ lần ghi gần
            nhất. Ghi cân mới (và % mỡ) ở thẻ Cân nặng trong tab Tổng quan.
          </p>
        </CoachCard>

        <CoachCard title="Mục tiêu và tập luyện" why={`${WHY.goal} ${WHY.training}`} dirty={dirty('goal')} footer={footer('goal')}>
          <GoalFields draft={draft} set={set} withCustomKcal />
          <TrainingFields draft={draft} set={set} />
        </CoachCard>

        <CoachCard title="Ăn uống và dị ứng" why={WHY.diet} dirty={dirty('diet')} footer={footer('diet')}>
          <DietFields draft={draft} set={set} />
          <ExcludedFields draft={draft} set={set} />
        </CoachCard>
      </div>

      <TargetsAside profile={profile} preview={preview} unsaved={dirty('body') || dirty('goal')} />
    </div>
  );
}

function pick(d: CoachDraft, g: Group): Partial<CoachDraft> {
  switch (g) {
    case 'body':
      return { sex: d.sex, birthDate: d.birthDate, heightCm: d.heightCm, activityLevel: d.activityLevel };
    case 'goal':
      return { goal: d.goal, targetWeightKg: d.targetWeightKg, customTargetKcal: d.customTargetKcal, trainingExperience: d.trainingExperience, trainingType: d.trainingType };
    case 'diet':
      return { dietType: d.dietType, suggestionStyle: d.suggestionStyle, allergens: d.allergens, excludedFoods: d.excludedFoods };
  }
}

// The numbers the draft WOULD give, so the right column moves while typing. null when the draft is not
// complete enough (no weight yet, an empty height...). The server recomputes everything on save.
function previewFor(profile: Profile, d: CoachDraft): PreviewTargets | null {
  const height = Number(d.heightCm);
  if (profile.latestWeightKg == null || !d.birthDate || !(height >= 100 && height <= 250)) return null;
  const custom = optionalNumber(d.customTargetKcal);
  return previewTargets({
    sex: d.sex, weightKg: profile.latestWeightKg, heightCm: height, bodyFatPct: profile.latestBodyFatPct,
    age: ageOn(d.birthDate, todayVn()), activity: d.activityLevel, goal: d.goal, experience: d.trainingExperience,
    trainingType: d.trainingType, customTargetKcal: custom != null && custom >= 1000 && custom <= 6000 ? custom : null,
  });
}

// dirty: unsaved edits -> amber border (the same amber as "Có thay đổi chưa lưu")
function CoachCard({ title, why, dirty, footer, children }: {
  title: string; why: string; dirty: boolean; footer: ReactNode; children: ReactNode;
}) {
  return (
    <section className={`grid min-w-0 gap-5 rounded-card border-2 bg-surface p-5 text-ink transition-colors md:p-6 ${
      dirty ? 'border-warn' : 'border-transparent'}`}>
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="flex gap-2 text-sm leading-relaxed text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
          <span>{why}</span>
        </p>
      </div>
      {children}
      {footer}
    </section>
  );
}

function SaveBar({ dirty, saving, error, onSave, onReset }: {
  dirty: boolean; saving: boolean; error?: string; onSave: () => void; onReset: () => void;
}) {
  return (
    <div className="grid gap-3 border-t border-line pt-4">
      {error && <Alert type="error">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className={`mr-auto text-sm ${dirty ? 'text-warn' : 'text-muted'}`} aria-live="polite">
          {saving ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}
        </span>
        {dirty && <Button variant="secondary" onClick={onReset} disabled={saving}>Huỷ</Button>}
        <Button onClick={onSave} disabled={!dirty || saving}>Lưu</Button>
      </div>
    </div>
  );
}

// Right column (below on phones): the numbers these answers produce. While a card has unsaved edits it
// shows the preview with the saved value struck through, in amber.
function TargetsAside({ profile, preview, unsaved }: { profile: Profile; preview: PreviewTargets | null; unsaved: boolean }) {
  const saved = profile.energy;
  const shown = unsaved && preview ? preview : saved;
  const changed = (a: number | undefined, b: number | undefined) => unsaved && preview != null && a !== b;
  return (
    <aside className="grid gap-3 lg:sticky lg:top-6">
      <section aria-labelledby="targets-title" aria-live="polite"
        className={`grid gap-4 rounded-card border-2 p-5 text-ink transition-colors ${
          unsaved ? 'border-warn bg-warn-bg' : 'border-accent bg-soft'}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="targets-title" className="text-sm text-muted">Mục tiêu của bạn</h2>
          {unsaved && <span className="rounded-full bg-warn px-2.5 py-0.5 text-[11px] font-bold text-ground">Xem trước, chưa lưu</span>}
        </div>
        {shown ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Figure value={formatNumber(shown.targetKcal)} unit="kcal/ngày"
                was={changed(shown.targetKcal, saved?.targetKcal) && saved ? formatNumber(saved.targetKcal) : null} />
              <Figure value={String(shown.proteinTargetG)} unit="g đạm/ngày" className="text-protein"
                was={changed(shown.proteinTargetG, saved?.proteinTargetG) && saved ? String(saved.proteinTargetG) : null} />
            </div>
            <ul className="grid gap-1.5 border-t border-line pt-3 text-[13px] text-ink/85">
              <li>
                TDEE {formatNumber(shown.tdee)} kcal, mục tiêu{' '}
                {shown.targetKcal === shown.tdee ? 'bằng mức tiêu hao'
                  : `${shown.targetKcal > shown.tdee ? '+' : '−'}${formatNumber(Math.abs(shown.targetKcal - shown.tdee))} kcal`}
              </li>
              <li>Đạm {formatNumber(shown.proteinPerKg)} g/kg {shown.proteinBasis === 'LEAN_MASS' ? 'khối nạc' : 'cân nặng'}</li>
            </ul>
            {unsaved && <p className="text-[13px] text-warn">Bấm Lưu ở thẻ có viền vàng để áp dụng.</p>}
          </>
        ) : (
          <p className="text-sm text-muted">Ghi cân nặng để MAIFit tính calo và đạm cho bạn.</p>
        )}
        <Link to="/about/allergens" className="text-[13px]">Dữ liệu dị ứng hoạt động thế nào?</Link>
      </section>
      <p className="rounded-card bg-surface p-4 text-[13px] leading-relaxed text-muted">
        Chỉ bạn thấy hồ sơ này. MBotFit chỉ nhận các lựa chọn và con số (tuổi, cân nặng, mục tiêu, calo, đạm), không nhận thông tin dị ứng.
      </p>
    </aside>
  );
}

function Figure({ value, unit, was, className = '' }: { value: string; unit: string; was: string | null; className?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-display text-4xl font-bold tabular-nums ${className}`}>{value}</span>
      <span className="text-sm text-muted">{unit}</span>
      {was && <s className="w-full text-sm text-muted tabular-nums">trước: {was}</s>}
    </p>
  );
}
