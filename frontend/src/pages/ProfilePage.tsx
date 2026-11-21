import { Crown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { ButtonLink } from '../components/ButtonLink';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { PaymentDialog } from '../components/premium/PaymentDialog';
import { PremiumBlock } from '../components/premium/PremiumBlock';
import { AccountCard } from '../components/profile/AccountCard';
import { AppearanceCard } from '../components/profile/AppearanceCard';
import { CoachProfileTab } from '../components/profile/CoachProfileTab';
import { CoachSummaryCard } from '../components/profile/CoachSummaryCard';
import { ProfileNudge } from '../components/profile/ProfileNudge';
import { AiQuotaCard, EnergyStats, MacroDetails } from '../components/profile/ProfileStats';
import { TrainingTimeCard } from '../components/profile/TrainingTimeCard';
import { WeightSection } from '../components/profile/WeightSection';
import { getErrorMessage } from '../constants/errorMessages';
import { useAuth } from '../hooks/useAuth';
import { usePremiumCheckout } from '../hooks/usePremiumCheckout';
import type { Profile } from '../types/profile';

type Tab = 'overview' | 'coach' | 'settings';

function isTab(value: string | null): value is Tab {
  return value === 'overview' || value === 'coach' || value === 'settings';
}

// Three tabs, kept in the address (?tab=coach) so a link or a reload opens the same one
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';
  const checkout = usePremiumCheckout();
  const [payOpen, setPayOpen] = useState(false);
  const [statsKey, setStatsKey] = useState(0); // bumped after paying: the AI limits grow
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First load. setState only inside .then()/.catch() (react-hooks/set-state-in-effect).
  useEffect(() => {
    let ignore = false;
    profileApi.find()
      .then((p) => { if (!ignore) setProfile(p); })
      .catch((err: unknown) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  // After a check-in (the latest weight changes BMR / TDEE). Called from event handlers only.
  async function reloadProfile() {
    try {
      setProfile(await profileApi.find());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function selectTab(next: Tab) {
    setParams(next === 'overview' ? {} : { tab: next }, { replace: true });
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
      {/* The page's one graphite block: who you are, and Premium on the right (below on phones) */}
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
              {profile && <span>· {profile.age} tuổi</span>}
            </p>
          </div>
        </div>
        <PremiumBlock checkout={checkout} onBuy={openPayment} />
      </section>

      <div className="flex items-center gap-2">
        <SegmentedTabs<Tab> label="Hồ sơ" value={tab} onChange={selectTab} items={[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'coach', label: 'Hồ sơ huấn luyện' },
          { id: 'settings', label: 'Cài đặt' },
        ]} />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {tab === 'overview' && (
        <>
          <ProfileNudge profile={profile} dismissible={false} />
          {profile?.energy && <EnergyStats energy={profile.energy} goal={profile.goal} />}
          <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <TrainingTimeCard />
            <AiQuotaCard refreshKey={statsKey} />
          </div>
          {profile && (
            <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Check-ins need a profile first, so TDEE can be recomputed right away */}
              <WeightSection onChanged={() => void reloadProfile()} />
              <div className="grid gap-4 md:gap-5">
                <CoachSummaryCard profile={profile} onEdit={() => selectTab('coach')} />
                {profile.energy && (
                  <section className="rounded-card bg-surface p-5 text-ink md:p-6"><MacroDetails energy={profile.energy} /></section>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'coach' && (profile ? (
        <CoachProfileTab profile={profile} onSaved={setProfile} />
      ) : (
        <section className="grid justify-items-start gap-3 rounded-card bg-surface p-6 text-ink">
          <h2 className="text-lg font-semibold">Chưa có hồ sơ huấn luyện</h2>
          <p className="text-muted">Trả lời vài câu ngắn để MAIFit tính calo, đạm và lọc món gợi ý cho riêng bạn. Khoảng 2 phút.</p>
          <ButtonLink to="/onboarding">Bắt đầu thiết lập</ButtonLink>
        </section>
      ))}

      {tab === 'settings' && (
        <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-2">
          <AppearanceCard />
          <div className="grid gap-4 md:gap-5">
            <AccountCard email={user?.email ?? ''} checkout={checkout} onBuy={openPayment}
            onLogout={() => void handleLogout()} loggingOut={loggingOut} />
          </div>
        </div>
      )}

      <PaymentDialog open={payOpen} onClose={closePayment} checkout={checkout} name={name} />
    </div>
  );
}
