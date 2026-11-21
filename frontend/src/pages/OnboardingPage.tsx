import { Bot, Check, ShieldCheck, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { bodyCheckinApi, profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Logo } from '../components/brand/Logo';
import { FullPageLoader } from '../components/FullPageLoader';
import { Modal } from '../components/Modal';
import { WhyNote } from '../components/profile/coach/fields';
import { BodyFields, DietFields, ExcludedFields, GoalFields, TrainingFields } from '../components/profile/coach/sections';
import { COACH_WHY as WHY, GOAL_SHORT } from '../constants/profile';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import { useAuth } from '../hooks/useAuth';
import type { Profile, ProfileRequest } from '../types/profile';
import { changesOf, draftFrom, type CoachDraft, type CoachSection } from '../utils/coachDraft';
import { formatNumber, optionalNumber } from '../utils/number';
import { markOnboardingSkipped } from '../utils/onboarding';
import { coachGaps, toRequest } from '../utils/profileRequest';

interface Step {
  section: CoachSection;
  nav: string; // the step list on desktop
  title: string;
  sub: string;
  why: string;
  cheer?: string;
  optional?: boolean;
}

// Welcome (0) -> five steps (1-5) -> done (6). Every "Tiếp tục" saves at once, so leaving half way keeps
// what was answered. Step 1 creates the profile (it holds everything TDEE needs).
const STEPS: Step[] = [
  { section: 'body', nav: 'Cơ thể và vận động', title: 'Cơ thể bạn', sub: '5 câu cơ bản, khoảng 30 giây.', why: WHY.body,
    cheer: 'Phần quan trọng nhất: xong bước này là có mục tiêu calo' },
  { section: 'goal', nav: 'Mục tiêu', title: 'Bạn muốn đạt điều gì?', sub: 'Chọn một mục tiêu, đổi lại lúc nào cũng được.', why: WHY.goal },
  { section: 'training', nav: 'Tập luyện', title: 'Bạn tập luyện thế nào?', sub: '2 câu chọn nhanh, không cần gõ.', why: WHY.training,
    cheer: 'Đã qua nửa chặng, còn 2 bước' },
  { section: 'diet', nav: 'Ăn uống và dị ứng', title: 'Ăn uống và dị ứng', sub: 'Không dị ứng gì thì để trống và bấm Tiếp tục.', why: WHY.diet },
  { section: 'excluded', nav: 'Món không ăn', title: 'Có món nào bạn không ăn?', optional: true,
    sub: 'Bước cuối và không bắt buộc. Không thích, không hợp, hay đơn giản là ngán đều được.', why: WHY.excluded },
];
const DONE = STEPS.length + 1;

// Where to start: a new user sees the welcome; someone coming back starts at the first missing answer
function firstStep(profile: Profile | null): number {
  if (!profile) return 0;
  const gaps = coachGaps(profile);
  if (gaps.includes('body')) return 1;
  if (gaps.includes('training')) return 3;
  if (gaps.includes('diet')) return 4;
  return 1;
}

function fullRequest(d: CoachDraft): ProfileRequest {
  return {
    ...(changesOf(['body', 'goal', 'training', 'diet', 'excluded'], d) as ProfileRequest),
    customTargetKcal: optionalNumber(d.customTargetKcal),
  };
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<CoachDraft>(() => draftFrom(null));
  const [step, setStep] = useState<number | null>(null); // null while loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [askSkip, setAskSkip] = useState(false);
  const set = (changes: Partial<CoachDraft>) => setDraft((d) => ({ ...d, ...changes }));

  useEffect(() => {
    let ignore = false;
    profileApi.find()
      .then((p) => {
        if (ignore) return;
        setProfile(p);
        setDraft(draftFrom(p));
        setStep(firstStep(p));
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(getErrorMessage(err));
        setStep(0);
      });
    return () => { ignore = true; };
  }, []);

  if (step === null) return <FullPageLoader />;

  const firstName = user?.displayName.split(' ').at(-1) ?? '';

  function leave() {
    markOnboardingSkipped();
    navigate('/', { replace: true });
  }

  async function saveStep(current: Step) {
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      let saved: Profile;
      if (current.section === 'body') {
        saved = await profileApi.save(profile ? toRequest(profile, changesOf(['body'], draft)) : fullRequest(draft));
        // The weight is a body check-in: only a new one when it changed (or a body fat % was given)
        const weight = Number(draft.weightKg);
        const fat = optionalNumber(draft.bodyFatPct);
        if (weight !== saved.latestWeightKg || fat != null) {
          await bodyCheckinApi.create({ weightKg: weight, bodyFatPct: fat });
          saved = (await profileApi.find()) ?? saved; // the energy targets need the new weight
        }
      } else {
        if (!profile) throw new Error('Hãy hoàn tất bước 1 trước.');
        saved = await profileApi.save(toRequest(profile, changesOf([current.section], draft)));
      }
      setProfile(saved);
      setStep((s) => (s ?? 0) + 1);
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  if (step === 0) {
    return (
      <Shell onSkip={leave} skipLabel="Để sau">
        <div className="mx-auto grid w-full max-w-xl gap-6 py-4">
          <div className="grid gap-2">
            <p className="font-semibold text-link">Chào {firstName}, tài khoản đã sẵn sàng</p>
            <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">Cho MAIFit 2 phút để hiểu bạn</h1>
            <p className="text-muted">
              Mỗi người cần một lượng calo và đạm khác nhau. Trả lời vài câu ngắn để mọi con số trong app là của riêng bạn,
              không phải số trung bình.
            </p>
          </div>
          <section className="grid gap-4 rounded-card bg-surface p-5 md:p-6" aria-label="Sau khi điền xong">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Sau khi điền xong, bạn có</p>
            <Benefit icon={Target} title="Mục tiêu calo và đạm của riêng bạn" text="Tính từ cơ thể, mục tiêu và cách bạn tập, kèm nguồn khoa học." />
            <Benefit icon={ShieldCheck} title="Gợi ý món an toàn" text="MBotFit loại món chứa thứ bạn dị ứng hoặc không ăn được." />
            <Benefit icon={Bot} title="MBotFit hiểu mục tiêu của bạn" text="Hỏi “Phở bò có hợp để giảm mỡ không?” là được trả lời đúng cho bạn." />
          </section>
          <p className="flex gap-2 text-sm text-muted">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
            Chỉ bạn thấy hồ sơ này. Có thể sửa hoặc xoá bất cứ lúc nào trong trang Hồ sơ.
          </p>
          <div className="grid gap-2 sm:flex sm:flex-row-reverse sm:justify-start">
            <Button size="lg" onClick={() => setStep(1)}>Bắt đầu · 5 bước ngắn</Button>
            <Button size="lg" variant="ghost" onClick={leave}>Tôi sẽ điền sau</Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === DONE) {
    const e = profile?.energy;
    return (
      <Shell>
        <div className="mx-auto grid w-full max-w-xl gap-6 py-4 text-center">
          <div className="grid justify-items-center gap-3">
            <span className="flex size-16 items-center justify-center rounded-full bg-success-bg text-success">
              <Check aria-hidden="true" className="size-8" strokeWidth={3} />
            </span>
            <h1 className="font-display text-4xl font-semibold">Xong rồi, {firstName}!</h1>
            <p className="max-w-md text-muted">Đây là mục tiêu của riêng bạn. MAIFit dùng nó cho nhật ký ăn, gợi ý món và MBotFit.</p>
          </div>
          {e && profile && (
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-card bg-accent p-5 text-on-accent">
                <p className="text-sm opacity-90">Calo mỗi ngày</p>
                <p className="font-display text-4xl font-bold tabular-nums">{formatNumber(e.targetKcal)}</p>
                <p className="text-sm opacity-90">{GOAL_SHORT[profile.goal]}</p>
              </div>
              <div className="rounded-card bg-surface p-5">
                <p className="text-sm text-muted">Đạm mỗi ngày</p>
                <p className="font-display text-4xl font-bold text-protein tabular-nums">{e.proteinTargetG} g</p>
                <p className="text-sm text-muted">{formatNumber(e.proteinPerKg)} g/kg {e.proteinBasis === 'LEAN_MASS' ? 'khối nạc' : 'cân nặng'}</p>
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:flex sm:justify-center">
            <Button size="lg" onClick={() => navigate('/chat', { replace: true })}>
              <Sparkles aria-hidden="true" className="size-5" /> Hỏi MBotFit hôm nay ăn gì
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/', { replace: true })}>Vào trang chủ</Button>
          </div>
        </div>
      </Shell>
    );
  }

  const current = STEPS[step - 1];
  const bodyReady = draft.birthDate !== '' && draft.heightCm !== '' && draft.weightKg !== '';
  const canContinue = current.section !== 'body' || bodyReady;
  const fieldsProps = { draft, set, fieldErrors, compact: true };

  return (
    <Shell onSkip={() => setAskSkip(true)} skipLabel="Bỏ qua"
      aside={<StepList current={step} targets={profile?.energy ? { kcal: profile.energy.targetKcal, protein: profile.energy.proteinTargetG } : null} />}>
      <form className="mx-auto grid w-full max-w-2xl gap-5"
        onSubmit={(e) => { e.preventDefault(); if (canContinue && !saving) void saveStep(current); }}>
        <div className="grid gap-2">
          <p className="text-sm text-muted">Bước {step}/{STEPS.length}</p>
          <div className="flex gap-1.5" role="progressbar" aria-label={`Bước ${step} trên ${STEPS.length}`}
            aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((s, i) => (
              <span key={s.section} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-accent' : 'bg-line'}`} />
            ))}
          </div>
        </div>
        <div className="grid gap-1">
          <h1 className="font-display text-3xl leading-tight font-semibold md:text-4xl">{current.title}</h1>
          <p className="text-muted">{current.sub}</p>
        </div>
        <WhyNote>{current.why}</WhyNote>
        {error && <Alert type="error">{error}</Alert>}

        {current.section === 'body' && <BodyFields {...fieldsProps} withCheckin />}
        {current.section === 'goal' && <GoalFields {...fieldsProps} compact={false} />}
        {current.section === 'training' && <TrainingFields {...fieldsProps} compact={false} />}
        {current.section === 'diet' && <DietFields {...fieldsProps} compact={false} />}
        {current.section === 'excluded' && <ExcludedFields {...fieldsProps} />}

        {current.cheer && <p className="text-center text-sm text-good">{current.cheer}</p>}
        <div className="sticky bottom-0 -mx-1 grid grid-cols-[auto_1fr] gap-2.5 bg-ground px-1 py-3 sm:static sm:flex sm:justify-end sm:bg-transparent">
          {step > 1 ? (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} disabled={saving}>Quay lại</Button>
          ) : <span />}
          <Button type="submit" size="lg" disabled={!canContinue || saving}>
            {saving ? 'Đang lưu…' : step === STEPS.length ? 'Hoàn tất' : 'Tiếp tục'}
          </Button>
        </div>
        {current.optional && (
          <Button variant="ghost" className="justify-self-center" onClick={() => setStep(DONE)} disabled={saving}>Bỏ qua bước này</Button>
        )}
      </form>

      <Modal open={askSkip} onClose={() => setAskSkip(false)} title="Bỏ qua phần còn lại?">
        <div className="grid gap-4">
          <p className="text-muted">
            Không sao cả. {profile ? 'Những gì bạn đã nhập đã được lưu.' : 'Bạn có thể quay lại bất cứ lúc nào.'} Chỉ là khi thiếu thông tin:
          </p>
          <ul className="grid gap-2 text-sm">
            {!profile?.energy && <li className="flex gap-2"><span className="font-bold text-warn">–</span>Chưa có mục tiêu calo và đạm của riêng bạn.</li>}
            <li className="flex gap-2"><span className="font-bold text-warn">–</span>
              <span>MBotFit chưa biết bạn dị ứng gì, nên <b>chưa lọc được món không an toàn</b> cho bạn.</span></li>
          </ul>
          <p className="rounded-xl bg-soft px-3.5 py-2.5 text-sm">
            Còn {STEPS.length - step + 1} bước, khoảng 1 phút. Bạn có thể điền tiếp ở trang Hồ sơ.
          </p>
          <Button size="lg" onClick={() => setAskSkip(false)}>Điền tiếp, chỉ còn 1 phút</Button>
          <Button variant="ghost" className="text-ink" onClick={leave}>Vẫn bỏ qua</Button>
        </div>
      </Modal>
    </Shell>
  );
}

function Benefit({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-link">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

// Full-screen page without the app navigation: the logo, a skip button, and (desktop) the step list
function Shell({ children, aside, onSkip, skipLabel }: {
  children: ReactNode; aside?: ReactNode; onSkip?: () => void; skipLabel?: string;
}) {
  return (
    <div className="min-h-dvh bg-ground text-ink lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      {aside && <aside className="hidden border-r border-line p-8 lg:flex lg:flex-col lg:gap-6">{aside}</aside>}
      <div className="flex min-h-dvh flex-col px-5 pt-5 pb-6 md:px-10 md:pt-8">
        <header className="mb-4 flex items-center justify-between">
          <span className={aside ? 'lg:invisible' : ''}><Logo className="text-2xl" /></span>
          {onSkip && <Button variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function StepList({ current, targets }: { current: number; targets: { kcal: number; protein: number } | null }) {
  return (
    <>
      <Logo className="text-2xl" />
      <div>
        <p className="font-display text-2xl font-semibold">Thiết lập hồ sơ</p>
        <p className="text-sm text-muted">Khoảng 2 phút. Mỗi bước được lưu ngay.</p>
      </div>
      <ol className="grid gap-1">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const now = n === current;
          return (
            <li key={s.section} aria-current={now ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${now ? 'bg-surface' : ''}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                done ? 'border-accent bg-accent text-on-accent' : now ? 'border-accent text-ink' : 'border-line text-muted'}`}>
                {done ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : n}
              </span>
              <span className={`text-sm font-semibold ${done || now ? 'text-ink' : 'text-muted'}`}>
                {s.nav}{s.optional && <span className="font-normal text-muted"> · không bắt buộc</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {targets && (
        <section className="mt-auto rounded-card bg-surface p-4">
          <p className="text-xs text-muted">Mục tiêu hiện tại</p>
          <p className="mt-1 flex gap-5">
            <span><span className="font-display text-3xl font-bold tabular-nums">{formatNumber(targets.kcal)}</span> <span className="text-xs text-muted">kcal</span></span>
            <span><span className="font-display text-3xl font-bold text-protein tabular-nums">{targets.protein}</span> <span className="text-xs text-muted">g đạm</span></span>
          </p>
          <p className="text-xs text-muted">Cập nhật sau mỗi bước.</p>
        </section>
      )}
    </>
  );
}
