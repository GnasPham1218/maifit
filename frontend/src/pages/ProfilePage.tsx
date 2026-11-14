import { Crown, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { bodyCheckinApi, profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { FormField } from '../components/FormField';
import { PaymentDialog } from '../components/premium/PaymentDialog';
import { PremiumBlock } from '../components/premium/PremiumBlock';
import { AppearanceCard } from '../components/profile/AppearanceCard';
import { AiQuotaCard, EnergyStats, MacroDetails } from '../components/profile/ProfileStats';
import { ProfileSection } from '../components/profile/ProfileSection';
import { TrainingTimeCard } from '../components/profile/TrainingTimeCard';
import { WeightSection } from '../components/profile/WeightSection';
import { usePremiumCheckout } from '../hooks/usePremiumCheckout';
import { SelectField } from '../components/SelectField';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS } from '../constants/profile';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import type { ActivityLevel, Goal, Profile, Sex } from '../types/profile';
import { optionalNumber } from '../utils/number';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

interface FormState {
  sex: Sex;
  birthDate: string;
  heightCm: string;
  activityLevel: ActivityLevel;
  goal: Goal;
  customTargetKcal: string;
  weightKg: string; // only used for the first setup (later weights go through check-ins)
}

const EMPTY_FORM: FormState = {
  sex: 'MALE',
  birthDate: '',
  heightCm: '',
  activityLevel: 'MODERATE',
  goal: 'MAINTAIN',
  customTargetKcal: '',
  weightKg: '',
};

function toForm(p: Profile): FormState {
  return {
    sex: p.sex,
    birthDate: p.birthDate,
    heightCm: String(p.heightCm),
    activityLevel: p.activityLevel,
    goal: p.goal,
    customTargetKcal: p.customTargetKcal != null ? String(p.customTargetKcal) : '',
    weightKg: '',
  };
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = usePremiumCheckout();
  const [payOpen, setPayOpen] = useState(false);
  const [statsKey, setStatsKey] = useState(0); // bumped after paying: the AI limits grow
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // First load. setState only inside .then()/.catch(), never synchronously in the effect body
  // (react-hooks/set-state-in-effect). `ignore` drops a late response after unmount.
  useEffect(() => {
    let ignore = false;
    profileApi.find()
      .then((p) => {
        if (ignore) return;
        setProfile(p);
        if (p) setForm(toForm(p));
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Reload after saving or a check-in (the latest weight changes BMR / TDEE).
  // Called from event handlers only.
  async function reloadProfile(): Promise<Profile | null> {
    try {
      const p = await profileApi.find();
      setProfile(p);
      return p;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }

  const needsWeight = profile?.latestWeightKg == null;

  async function handleSubmit() {
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setSubmitting(true);
    try {
      await profileApi.save({
        sex: form.sex,
        birthDate: form.birthDate,
        heightCm: Number(form.heightCm),
        activityLevel: form.activityLevel,
        goal: form.goal,
        customTargetKcal: optionalNumber(form.customTargetKcal),
      });
      if (needsWeight && form.weightKg) {
        await bodyCheckinApi.create({ weightKg: Number(form.weightKg) });
      }
      const p = await reloadProfile();
      if (p) setForm(toForm(p));
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  // Mua / Gia hạn: open the dialog, then create the order (or get back the one still waiting)
  function openPayment() {
    setPayOpen(true);
    if (!checkout.waiting) void checkout.checkout();
  }

  function closePayment() {
    if (checkout.paid) setStatsKey((k) => k + 1);
    checkout.clearFinished();
    setPayOpen(false);
  }

  // "Mở khóa với Premium" elsewhere (chat, photo limits, old /premium links) lands here with openPay
  const openPayRequested = (location.state as { openPay?: unknown } | null)?.openPay === true;
  const handledOpenPay = useRef(false);
  useEffect(() => {
    if (!openPayRequested || handledOpenPay.current || !checkout.plan) return;
    handledOpenPay.current = true;
    navigate('.', { replace: true, state: null }); // a reload must not open it again
    openPayment();
  });

  if (loading) return <p className="text-sm text-muted">Đang tải…</p>;

  const name = user?.displayName ?? '';
  const premium = checkout.plan?.premium ?? false;

  return (
    <div className="grid gap-4 md:gap-5">
      {/* The page's one graphite block (same in both themes, like the home and leaderboard heroes):
          who you are, and Premium on the right (below on phones) */}
      <section className="grid gap-5 rounded-card bg-hero p-5 text-hero-ink md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:items-center md:gap-6 md:p-7">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <Avatar name={name} size={96} premium={premium} />
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="truncate pb-[0.08em] font-display text-3xl leading-[1.2] font-bold md:text-4xl">{name}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-hero-muted">
              {premium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-[#1c1e24]">
                  <Crown aria-hidden="true" className="size-3.5" /> Premium
                </span>
              )}
              <span className="truncate">{user?.email}</span>
            </p>
            <Button variant="hero" size="sm" className="justify-self-start" onClick={() => void handleLogout()} disabled={loggingOut}>
              <LogOut aria-hidden="true" className="size-4" /> {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </Button>
          </div>
        </div>
        <PremiumBlock checkout={checkout} onBuy={openPayment} />
      </section>

      {!profile && (
        <Alert type="info">Nhập vài thông tin để MAIFit tính lượng calo phù hợp cho bạn mỗi ngày.</Alert>
      )}
      {profile?.energy && <EnergyStats energy={profile.energy} goal={profile.goal} />}

      {/* Rows 2 and 3 share the same two columns, so their cards line up */}
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <TrainingTimeCard />
        <AiQuotaCard refreshKey={statsKey} />
      </div>

      <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProfileSection title="Thông tin cơ thể" subtitle="Lưu xong, calo mục tiêu được tính lại ngay.">
          {error && <Alert type="error">{error}</Alert>}
          {saved && <Alert type="success">Đã lưu hồ sơ.</Alert>}
          <form
            className="grid gap-3.5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <FormField label="Ngày sinh" name="birthDate" type="date" required
              value={form.birthDate} error={fieldErrors.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <SelectField label="Giới tính" name="sex" options={SEX_OPTIONS} value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })} />
            <FormField label="Chiều cao (cm)" name="heightCm" type="number" step="0.1" min="100" max="250" required
              value={form.heightCm} error={fieldErrors.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            {needsWeight && (
              <FormField label="Cân nặng hiện tại (kg)" name="weightKg" type="number" step="0.1" min="20" max="400"
                required value={form.weightKg} error={fieldErrors.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            )}
            <SelectField label="Mức vận động" name="activityLevel" options={ACTIVITY_OPTIONS}
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })} />
            <SelectField label="Mục tiêu" name="goal" options={GOAL_OPTIONS} value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })} />
            <FormField label="Calo tự đặt (không bắt buộc)" name="customTargetKcal" type="number"
              min="1000" max="6000" value={form.customTargetKcal} error={fieldErrors.customTargetKcal}
              onChange={(e) => setForm({ ...form, customTargetKcal: e.target.value })} />
            <div className="flex items-end justify-end sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
          {profile?.energy && <MacroDetails energy={profile.energy} />}
        </ProfileSection>

        {/* Check-ins need a profile first, so TDEE can be recomputed right away */}
        {profile && <WeightSection onChanged={() => void reloadProfile()} />}
      </div>

      <AppearanceCard />

      <PaymentDialog open={payOpen} onClose={closePayment} checkout={checkout} name={name} />
    </div>
  );
}
