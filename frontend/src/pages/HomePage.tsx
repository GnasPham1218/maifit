import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { bodyCheckinApi, profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { WeightSparkline } from '../components/WeightSparkline';
import { getErrorMessage } from '../constants/errorMessages';
import { ACTIVITY_OPTIONS, FORMULA_LABELS, GOAL_OPTIONS } from '../constants/profile';
import type { BodyCheckin, Profile } from '../types/profile';
import { formatDelta, formatNumber } from '../utils/number';

const TREND_DAYS = 30;

// yyyy-MM-dd in Vietnam time, `days` days ago (the API filters by Vietnam calendar days)
function vnDateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // en-CA -> 2026-11-02
}

function labelOf<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

// Big rounded call-to-action link, like the "Get started" button in the reference style
function CtaLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3 font-medium text-ink no-underline">
      {children}
      <span className="flex size-11 items-center justify-center rounded-full border border-ink/30 bg-surface">
        <ArrowRight aria-hidden="true" className="size-5" />
      </span>
    </Link>
  );
}

interface DashboardData {
  profile: Profile | null;
  checkins: BodyCheckin[]; // last 30 days, oldest first
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // Two requests in parallel
    Promise.all([profileApi.find(), bodyCheckinApi.list(vnDateDaysAgo(TREND_DAYS - 1))])
      .then(([profile, checkins]) => {
        if (!ignore) setData({ profile, checkins });
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <p className="text-muted">Đang tải…</p>;

  const { profile, checkins } = data;

  // First visit: nothing to show yet except the way to get started
  if (!profile || !profile.energy) {
    return (
      <section className="rounded-card bg-sky p-8">
        <span className="rounded-full bg-sky-strong px-3 py-1 text-sm font-medium text-white">Bắt đầu</span>
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight">
          {profile ? 'Ghi cân nặng đầu tiên để tính mục tiêu calo' : 'Thiết lập hồ sơ để nhận mục tiêu calo mỗi ngày'}
        </h2>
        <div className="mt-8">
          <CtaLink to="/profile">{profile ? 'Ghi cân nặng' : 'Thiết lập hồ sơ'}</CtaLink>
        </div>
      </section>
    );
  }

  const energy = profile.energy;
  const macros = energy.macros.find((m) => m.split === 'MODERATE_CARB') ?? energy.macros[0];
  const change = checkins.length >= 2 ? checkins[checkins.length - 1].weightKg - checkins[0].weightKg : null;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Hero: today's target */}
      <section className="flex flex-col justify-between gap-8 rounded-card bg-sky p-8 lg:col-span-2">
        <div>
          <span className="rounded-full bg-sky-strong px-3 py-1 text-sm font-medium text-white">Mục tiêu hôm nay</span>
          <p className="mt-6 flex items-baseline gap-2">
            <strong className="text-6xl font-light tracking-tight">{formatNumber(energy.targetKcal)}</strong>
            <span className="text-lg text-ink-soft">kcal</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-surface px-3 py-1">Đạm {macros.proteinG} g</span>
            <span className="rounded-full bg-surface px-3 py-1">Béo {macros.fatG} g</span>
            <span className="rounded-full bg-surface px-3 py-1">Carb {macros.carbG} g</span>
          </div>
        </div>
        <CtaLink to="/profile">Xem cách tính</CtaLink>
      </section>

      <div className="grid gap-5">
        <StatTile
          tone="lime"
          label="Cân nặng hiện tại"
          value={profile.latestWeightKg != null ? formatNumber(profile.latestWeightKg) : '—'}
          unit="kg"
          hint={change != null ? `${formatDelta(change)} kg trong ${TREND_DAYS} ngày` : undefined}
        />
        <StatTile
          tone="peach"
          label="TDEE (duy trì)"
          value={formatNumber(energy.tdee)}
          unit="kcal"
          hint={FORMULA_LABELS[energy.formula]}
        />
      </div>

      <Card title={`Cân nặng ${TREND_DAYS} ngày`} className="lg:col-span-2">
        <WeightSparkline checkins={checkins} />
      </Card>

      <Card title="Hồ sơ">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Mục tiêu</dt>
            <dd className="text-right font-medium">{labelOf(GOAL_OPTIONS, profile.goal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Vận động</dt>
            <dd className="text-right font-medium">{labelOf(ACTIVITY_OPTIONS, profile.activityLevel)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Tuổi · chiều cao</dt>
            <dd className="text-right font-medium">
              {profile.age} · {formatNumber(profile.heightCm)} cm
            </dd>
          </div>
        </dl>
        <Link to="/profile" className="mt-5 inline-block text-sm font-medium">
          Sửa hồ sơ
        </Link>
      </Card>
    </div>
  );
}
