import { BookOpen, Calculator, Camera, Check, Crown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { paymentApi } from '../apis/paymentApi';
import { ButtonLink } from '../components/ButtonLink';
import { BotPreview, CaloriePreview, RepPreview } from '../components/marketing/Previews';
import type { Pricing } from '../types/payment';
import { formatVnd } from '../utils/premium';

// "/" for visitors (logged-in users get the home page there). Only what the app does today:
// new features get a section when they ship.
export default function LandingPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    let ignore = false;
    paymentApi
      .pricing()
      .then((p) => {
        if (!ignore) setPricing(p);
      })
      .catch(() => {}); // the pricing cards then show without numbers
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-ground text-ink">
      <Header />
      <main>
        <Hero />
        <div id="tinh-nang" className="mx-auto grid max-w-6xl scroll-mt-20 gap-20 px-5 py-20 md:gap-28 md:px-8 md:py-28">
          <Feature title="Chụp bữa ăn, calo tính từ dữ liệu thật"
            text="AI chỉ nhận ra món và ước lượng gram. Calo, đạm, carb, béo luôn tính từ bảng thực phẩm USDA. Bạn sửa gram là số liệu tính lại."
            visual={<MealVisual />} />
          <Feature reverse title="Hỏi MBotFit, nhận câu trả lời có nguồn"
            text="MBotFit chỉ trả lời từ tài liệu dinh dưỡng và tập luyện của MAIFit, ghi nguồn dưới mỗi câu. Câu hỏi về bệnh lý, thuốc được khuyên hỏi bác sĩ."
            visual={<ChatVisual />} />
          <Feature title="Bảng xếp hạng theo tuần, mỗi set được kiểm tra lại"
            text="Tổng rep và chuỗi ngày tập so với mọi người. Máy chủ kiểm tra lại tốc độ và thời gian của từng set trước khi tính."
            visual={<LeaderboardVisual />} />
        </div>
        <Trust />
        <PricingSection pricing={pricing} />
        <section className="bg-accent text-on-accent">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-16 md:px-8">
            <p className="max-w-[16ch] font-display text-4xl leading-[1.1] font-bold md:text-5xl">Set đầu tiên chỉ cần một chiếc điện thoại.</p>
            <Link to="/register"
              className="inline-flex min-h-14 items-center rounded-full bg-white px-7 font-semibold text-accent transition-opacity hover:text-accent hover:opacity-90">
              Tạo tài khoản miễn phí
            </Link>
          </div>
        </section>
      </main>
      <footer className="bg-hero text-hero-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-xs md:px-8">
          <p><span className="font-semibold text-hero-ink">MAIFit</span>, dự án cá nhân. Thông tin tham khảo, không thay thế tư vấn y tế.</p>
          <p>Dữ liệu thực phẩm: USDA FoodData Central. Tài liệu: ISSN (CC BY 4.0).</p>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 bg-hero/95 text-hero-ink backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link to="/" className="font-display text-2xl font-bold text-accent hover:text-accent">MAIFit</Link>
        <nav aria-label="Trang giới thiệu" className="hidden gap-7 text-sm md:flex">
          {[['#tinh-nang', 'Tính năng'], ['#so-lieu', 'Số liệu'], ['#bang-gia', 'Bảng giá']].map(([href, label]) => (
            <a key={href} href={href} className="text-hero-muted hover:text-hero-ink">{label}</a>
          ))}
        </nav>
        <ButtonLink to="/login" variant="hero" size="sm">Đăng nhập</ButtonLink>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-hero text-hero-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <h1 className="max-w-[12ch] pb-[0.06em] font-display text-5xl leading-[1.05] font-bold md:text-7xl">Xuống đủ sâu mới tính rep.</h1>
          <p className="max-w-xl text-lg text-hero-muted">
            MAIFit đếm rep bằng camera theo góc khớp, tính calo bữa ăn từ bảng dữ liệu USDA và trả lời câu hỏi dinh dưỡng có trích nguồn.
            Miễn phí để bắt đầu.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/register" size="lg">Tạo tài khoản miễn phí</ButtonLink>
            <ButtonLink to="/login" variant="hero" size="lg">Đăng nhập</ButtonLink>
          </div>
          <p className="text-sm text-hero-muted">Chạy trên trình duyệt điện thoại và máy tính. Video không rời máy bạn.</p>
        </div>
        <RepPreview className="aspect-[4/5] w-full max-w-md justify-self-center lg:justify-self-end" />
      </div>
    </section>
  );
}

function Feature({ title, text, visual, reverse = false }: { title: string; text: string; visual: ReactNode; reverse?: boolean }) {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`grid gap-4 ${reverse ? 'lg:order-2' : ''}`}>
        <h2 className="max-w-[18ch] font-display text-4xl leading-[1.12] font-bold md:text-5xl">{title}</h2>
        <p className="max-w-[52ch] text-lg text-muted">{text}</p>
      </div>
      <div className="min-w-0">{visual}</div>
    </section>
  );
}

function MealVisual() {
  const rows = [['Cơm trắng', '200 g', '260 kcal'], ['Ức gà luộc', '120 g', '198 kcal'], ['Rau muống luộc', '80 g', '15 kcal']];
  return (
    <div className="grid gap-4">
      <div className="rounded-card bg-surface p-5">
        <p className="mb-2 flex items-center gap-2 text-sm text-muted"><Camera aria-hidden="true" className="size-4 text-accent" /> Ảnh bữa trưa, AI nhận ra 3 món</p>
        <ul className="divide-y divide-line">
          {rows.map(([name, grams, kcal]) => (
            <li key={name} className="flex justify-between gap-3 py-2.5">
              <span>{name} <span className="text-muted">{grams}</span></span>
              <span className="font-semibold tabular-nums">{kcal}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-card bg-hero p-6 text-hero-ink"><CaloriePreview size={130} /></div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="grid gap-4 rounded-card bg-surface p-5 md:p-6">
      <p className="justify-self-end rounded-[22px] rounded-br-md bg-accent px-4 py-3 text-on-accent">100 g ức gà luộc với 1 quả trứng bao nhiêu calo?</p>
      <BotPreview text="Khoảng 229 kcal: 100 g ức gà luộc 151 kcal và 1 quả trứng luộc 50 g 78 kcal. Bạn có thể sửa gram hoặc ghi luôn vào bữa ăn."
        source="Bảng thực phẩm MAIFit, Ức gà" />
      <div className="flex items-center gap-2 rounded-2xl bg-ground px-4 py-3 text-sm">
        <Calculator aria-hidden="true" className="size-4 text-accent" /> Tổng <span className="ml-auto font-display text-2xl font-bold">229 kcal</span>
      </div>
    </div>
  );
}

function LeaderboardVisual() {
  const rows: [number, string, number][] = [[1, 'Minh Khoa', 612], [2, 'Thu Hà', 540], [3, 'Quốc Bảo', 350], [4, 'Sang (bạn)', 312], [5, 'Lan Anh', 298]];
  return (
    <ol className="grid gap-1 rounded-card bg-surface p-4" aria-label="Ví dụ bảng xếp hạng tuần">
      {rows.map(([rank, name, reps]) => {
        const me = name.includes('(bạn)');
        return (
          <li key={rank} className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${me ? 'bg-soft font-semibold' : ''}`}>
            <span className="w-5 font-display text-xl font-bold text-accent">{rank}</span>
            <span className="flex-1">{name}</span>
            <span className="font-display text-2xl font-bold tabular-nums">{reps}</span>
            <span className="text-xs text-muted">rep</span>
          </li>
        );
      })}
    </ol>
  );
}

function Trust() {
  const items = [
    { icon: Camera, title: 'Video không rời máy bạn', text: 'Nhận diện tư thế chạy ngay trên trình duyệt. Máy chủ chỉ nhận số rep và thời gian.' },
    { icon: Calculator, title: 'AI không tự tính calo', text: 'Mọi con số dinh dưỡng đến từ USDA FoodData Central, cùng một công thức ở mọi nơi trong app.' },
    { icon: BookOpen, title: 'Nguồn ghi rõ ràng', text: 'Tài liệu của MBotFit là các bài tổng quan của ISSN, giấy phép CC BY 4.0, có link tới bài gốc.' },
  ];
  return (
    <section id="so-lieu" className="scroll-mt-20 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:px-8">
        <h2 className="font-display text-4xl font-bold md:text-5xl">Vì sao số liệu đáng tin</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="grid content-start gap-2">
              <Icon aria-hidden="true" className="size-6 text-accent" />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ pricing: p }: { pricing: Pricing | null }) {
  const free = [
    'Đếm rep squat và hít đất bằng camera',
    'Ghi bữa ăn, xem calo và macro',
    p ? `Nhận diện ảnh ${p.freeDailyScans} lượt mỗi ngày` : 'Nhận diện ảnh món ăn mỗi ngày',
    p ? `Hỏi MBotFit ${p.freeDailyChats} câu mỗi ngày` : 'Hỏi MBotFit mỗi ngày',
  ];
  const premium = [
    'Mọi thứ của gói miễn phí',
    p ? `Nhận diện ảnh ${p.premiumDailyScans} lượt mỗi ngày` : 'Thêm lượt nhận diện ảnh',
    p ? `Hỏi MBotFit ${p.premiumDailyChats} câu mỗi ngày` : 'Thêm câu hỏi MBotFit',
    'Viền ảnh đại diện Premium',
  ];
  return (
    <section id="bang-gia" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-5 py-20 md:px-8 md:py-28">
      <h2 className="font-display text-4xl font-bold md:text-5xl">Bảng giá</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <PlanCard title="Miễn phí" price="0đ" unit="mãi mãi" items={free}
          action={<ButtonLink to="/register" variant="secondary" className="w-full">Bắt đầu miễn phí</ButtonLink>} />
        <PlanCard dark title={<><Crown aria-hidden="true" className="size-5 text-gold" /> Premium</>}
          price={p ? formatVnd(p.price) : 'Premium'} unit={p ? `${p.days} ngày, không tự gia hạn` : 'giá hiện khi tải được bảng giá'} items={premium}
          action={<ButtonLink to="/register" className="w-full">Tạo tài khoản rồi nâng cấp</ButtonLink>} />
      </div>
    </section>
  );
}

function PlanCard({ title, price, unit, items, action, dark = false }: {
  title: ReactNode; price: string; unit: string; items: string[]; action: ReactNode; dark?: boolean;
}) {
  return (
    <div className={`grid content-start gap-5 rounded-card p-7 ${dark ? 'bg-hero text-hero-ink' : 'bg-surface'}`}>
      <h3 className="flex items-center gap-2 font-display text-2xl font-bold">{title}</h3>
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-5xl font-bold tabular-nums">{price}</span>
        <span className={dark ? 'text-hero-muted' : 'text-muted'}>{unit}</span>
      </p>
      <ul className="grid gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <Check aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={2.6} /> {item}
          </li>
        ))}
      </ul>
      <div className="mt-2">{action}</div>
    </div>
  );
}
