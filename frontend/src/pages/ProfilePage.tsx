import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { bodyCheckinApi, profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { BodyCheckinSection } from '../components/BodyCheckinSection';
import { EnergySummary } from '../components/EnergySummary';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS } from '../constants/profile';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import type { ActivityLevel, Goal, Profile, Sex } from '../types/profile';
import { optionalNumber } from '../utils/number';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

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

// The only logout button on phones (the bottom bar keeps its room for the pages)
function LogoutCard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 text-sm text-ink-soft">
        Đang đăng nhập: <span className="font-medium text-ink">{user?.displayName}</span>
      </p>
      <Button variant="secondary" onClick={() => void handleLogout()} disabled={busy}>
        <LogOut aria-hidden="true" className="size-4" />
        {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </Button>
    </Card>
  );
}

export default function ProfilePage() {
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

  if (loading) return <p className="text-sm text-muted">Đang tải…</p>;

  return (
    <section className="grid gap-4">
      <h2 className="mb-2 text-xl font-semibold">Hồ sơ của bạn</h2>
      {!profile && (
        <Alert type="info">Nhập vài thông tin để MAIFit tính lượng calo phù hợp cho bạn mỗi ngày.</Alert>
      )}

      {profile?.energy && <EnergySummary energy={profile.energy} />}

      <Card title="Thông tin cơ bản">
        {error && <Alert type="error">{error}</Alert>}
        {saved && <Alert type="success">Đã lưu hồ sơ.</Alert>}
        <form
          className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-end gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <SelectField label="Giới tính" name="sex" options={SEX_OPTIONS} value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })} />
          <FormField label="Ngày sinh" name="birthDate" type="date" required
            value={form.birthDate} error={fieldErrors.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
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
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </Button>
        </form>
      </Card>

      {/* Check-ins need a profile first, so TDEE can be recomputed right away */}
      {profile && <BodyCheckinSection onChanged={() => void reloadProfile()} />}

      <Card title="Giao diện">
        <ThemeSwitcher />
      </Card>

      <LogoutCard />
    </section>
  );
}
