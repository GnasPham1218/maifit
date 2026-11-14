import { BookOpen, Calculator, Camera, Check, Crown } from 'lucide-react';
import { LayoutGroup, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { paymentApi } from '../apis/paymentApi';
import { Logo, LogoMark } from '../components/brand/Logo';
import { ButtonLink } from '../components/ButtonLink';
import { JourneyPreview, StreakPreview } from '../components/marketing/JourneyPreview';
import { BotPreview, CaloriePreview, RepPreview } from '../components/marketing/Previews';
import { Reveal } from '../components/marketing/Reveal';
import { IN_VIEW_MARGIN, useInViewSteps } from '../hooks/useInViewSteps';
import type { Pricing } from '../types/payment';
import { formatVnd } from '../utils/premium';

// "/" for visitors (logged-in users get the home page there). Only what the app does today:
// new features get a section when they ship.
// Motion: the hero plays on load (with a scroll parallax), the rest plays once when scrolled to:
// text rises in (Reveal) and each preview has its own moment. Reduced motion: final states, fades only.
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
          <Feature title="Xuống đủ sâu mới tính rep"
            text="Chọn bài, đặt điện thoại xuống. MAIFit đếm rep theo góc khớp ngay trên trình duyệt: chưa đủ sâu thì chưa tính, video không rời máy bạn."
            visual={<RepPreview animated className="mx-auto aspect-[4/5] w-full max-w-md" />} />
          <Feature reverse title="Chụp bữa ăn, calo tính từ dữ liệu thật"
            text="AI chỉ nhận ra món và ước lượng gram. Calo, đạm, carb, béo luôn tính từ bảng thực phẩm USDA. Bạn sửa gram là số liệu tính lại."
            visual={<MealVisual />} />
          <Feature title="Hỏi MBotFit, nhận câu trả lời có nguồn"
            text="MBotFit chỉ trả lời từ tài liệu dinh dưỡng và tập luyện của MAIFit, ghi nguồn dưới mỗi câu. Câu hỏi về bệnh lý, thuốc được khuyên hỏi bác sĩ."
            visual={<ChatVisual />} />
          <Feature reverse title="Bảng xếp hạng theo tuần, mỗi set được kiểm tra lại"
            text="Tổng rep và chuỗi ngày tập so với mọi người. Máy chủ kiểm tra lại tốc độ và thời gian của từng set trước khi tính."
            visual={<LeaderboardVisual />} />
        </div>
        <Trust />
        <NameStory />
        <PricingSection pricing={pricing} />
        <section className="bg-accent text-on-accent">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-16 md:px-8">
            <Reveal><p className="max-w-[16ch] font-display text-4xl leading-[1.1] font-bold md:text-5xl">Set đầu tiên chỉ cần một chiếc điện thoại.</p></Reveal>
            <Reveal delay={0.15}>
            <Link to="/register"
              className="inline-flex min-h-14 items-center rounded-full bg-white px-7 font-semibold text-accent transition-opacity hover:text-accent hover:opacity-90">
              Tạo tài khoản miễn phí
            </Link>
            </Reveal>
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
        <Link to="/" className="inline-flex"><Logo tone="hero" className="text-2xl" /></Link>
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
  // On load, not on scroll: the hero is already on screen
  const enter = (i: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] as const },
  });
  return (
    <section className="overflow-hidden bg-hero text-hero-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          {/* The name's pun: "mai" is Vietnamese for tomorrow */}
          <h1 className="pb-[0.06em] font-display text-5xl leading-[1.05] font-bold md:text-7xl">
            <motion.span className="block" {...enter(0)}>Hôm nay chưa fit.</motion.span>
            <motion.span className="block" {...enter(1)}><span className="text-accent">Mai</span> sẽ fit.</motion.span>
          </h1>
          <motion.p className="max-w-xl text-lg text-hero-muted" {...enter(2)}>
            Không ai fit sau một buổi tập. Mỗi rep hôm nay, mỗi bữa ăn được ghi lại là một bước tới bạn của ngày mai.
          </motion.p>
          <motion.p className="max-w-xl text-hero-muted" {...enter(3)}>
            MAIFit đếm rep bằng camera theo góc khớp, tính calo bữa ăn từ bảng dữ liệu USDA và trả lời câu hỏi dinh dưỡng có trích nguồn.
            Miễn phí để bắt đầu.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3" {...enter(4)}>
            <ButtonLink to="/register" size="lg">Tạo tài khoản miễn phí</ButtonLink>
            <ButtonLink to="/login" variant="hero" size="lg">Đăng nhập</ButtonLink>
          </motion.div>
          <motion.p className="text-sm text-hero-muted" {...enter(5)}>Chạy trên trình duyệt điện thoại và máy tính. Video không rời máy bạn.</motion.p>
        </div>
        <JourneyPreview className="aspect-[4/5] w-full max-w-md justify-self-center lg:justify-self-end" />
      </div>
    </section>
  );
}

function Feature({ title, text, visual, reverse = false }: { title: string; text: string; visual: ReactNode; reverse?: boolean }) {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`grid gap-4 ${reverse ? 'lg:order-2' : ''}`}>
        <Reveal><h2 className="max-w-[18ch] font-display text-4xl leading-[1.12] font-bold md:text-5xl">{title}</h2></Reveal>
        <Reveal delay={0.1}><p className="max-w-[52ch] text-lg text-muted">{text}</p></Reveal>
      </div>
      <Reveal delay={0.15} className="min-w-0">{visual}</Reveal>
    </section>
  );
}

// Once in view: the 3 dishes appear one by one, as if just recognised, then the calorie ring draws in.
function MealVisual() {
  const rows = [['Cơm trắng', '200 g', '260 kcal'], ['Ức gà luộc', '120 g', '198 kcal'], ['Rau muống luộc', '80 g', '15 kcal']];
  const reduce = useReducedMotion();
  const { ref, step } = useInViewSteps([350, 450, 450, 400], reduce); // step 1-3: dishes, 4: ring
  return (
    <div ref={ref} className="grid gap-4">
      <div className="rounded-card bg-surface p-5">
        <p className="mb-2 flex items-center gap-2 text-sm text-muted">
          <Camera aria-hidden="true" className="size-4 text-accent" /> Ảnh bữa trưa, AI nhận ra {Math.min(step, 3)} món
        </p>
        <ul className="divide-y divide-line">
          {rows.map(([name, grams, kcal], i) => (
            <motion.li key={name} className="flex justify-between gap-3 py-2.5"
              initial={false} animate={{ opacity: step > i ? 1 : 0, x: step > i ? 0 : -12 }} transition={{ duration: 0.35 }}>
              <span>{name} <span className="text-muted">{grams}</span></span>
              <span className="font-semibold tabular-nums">{kcal}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      {/* min-h keeps the card's height (130 px ring + padding) while the ring waits for its turn */}
      <div className="min-h-[178px] rounded-card bg-hero p-6 text-hero-ink">{step >= 4 && <CaloriePreview size={130} />}</div>
    </div>
  );
}

// Once in view: the question flies in, MBotFit "types", then the answer and the total appear.
function ChatVisual() {
  const reduce = useReducedMotion();
  const { ref, step } = useInViewSteps([200, 700, 1300], reduce); // 1: question, 2: typing, 3: answer
  const pop = (visible: boolean, from: number) => ({
    initial: false as const,
    animate: { opacity: visible ? 1 : 0, y: visible ? 0 : from },
    transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const },
  });
  return (
    // min-h: the answer takes its place without pushing the page around
    <div ref={ref} className="grid min-h-[300px] content-start gap-4 rounded-card bg-surface p-5 md:p-6">
      <motion.p className="justify-self-end rounded-[22px] rounded-br-md bg-accent px-4 py-3 text-on-accent" {...pop(step >= 1, 14)}>
        100 g ức gà luộc với 1 quả trứng bao nhiêu calo?
      </motion.p>
      {step === 2 && (
        <motion.div className="flex items-center gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span aria-hidden="true" className="flex gap-1 rounded-2xl bg-ground px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-1.5 rounded-full bg-muted"
                animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.12, repeat: Infinity }} />
            ))}
          </span>
          <span className="text-sm text-muted">MBotFit đang trả lời…</span>
        </motion.div>
      )}
      {step >= 3 && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <BotPreview text="Khoảng 229 kcal: 100 g ức gà luộc 151 kcal và 1 quả trứng luộc 50 g 78 kcal. Bạn có thể sửa gram hoặc ghi luôn vào bữa ăn."
              source="Bảng thực phẩm MAIFit, Ức gà" />
          </motion.div>
          <motion.div className="flex items-center gap-2 rounded-2xl bg-ground px-4 py-3 text-sm"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Calculator aria-hidden="true" className="size-4 text-accent" /> Tổng <span className="ml-auto font-display text-2xl font-bold">229 kcal</span>
          </motion.div>
        </>
      )}
    </div>
  );
}

// Once in view: the rows slide in, then your total grows past Lan Anh and your row climbs from 5th to 4th.
function LeaderboardVisual() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: IN_VIEW_MARGIN });
  const { ref: stepRef, step } = useInViewSteps([1400], reduce);
  const climbed = step >= 1;
  const people: [string, number][] = [['Minh Khoa', 612], ['Thu Hà', 540], ['Quốc Bảo', 350], ['Lan Anh', 298], ['Sang (bạn)', climbed ? 312 : 290]];
  const rows = [...people].sort((a, b) => b[1] - a[1]);
  return (
    <div ref={stepRef}>
      <LayoutGroup>
        <ol ref={ref} className="grid gap-1 rounded-card bg-surface p-4" aria-label="Ví dụ bảng xếp hạng tuần">
          {rows.map(([name, reps], i) => {
            const me = name.includes('(bạn)');
            return (
              <motion.li key={name} layout="position"
                initial={reduce ? false : { opacity: 0, x: 24 }} animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 0.45, delay: inView && !climbed ? i * 0.08 : 0, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${me ? 'bg-soft font-semibold' : ''}`}>
                <span className="w-5 font-display text-xl font-bold text-accent">{i + 1}</span>
                <span className="flex-1">{name}</span>
                <span className="font-display text-2xl font-bold tabular-nums">{reps}</span>
                <span className="text-xs text-muted">rep</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
    </div>
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
        <Reveal><h2 className="font-display text-4xl font-bold md:text-5xl">Vì sao số liệu đáng tin</h2></Reveal>
        <div className="grid gap-8 md:grid-cols-3">
          {items.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={0.1 + i * 0.12} className="grid content-start gap-2">
              <motion.span className="inline-flex" initial={{ scale: 0.4 }} whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: IN_VIEW_MARGIN }} transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 + i * 0.12 }}>
                <Icon aria-hidden="true" className="size-6 text-accent" />
              </motion.span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// What the name means, next to a streak: being fit tomorrow comes from showing up every day.
// Sits between the trust section and the prices.
function NameStory() {
  const parts = [
    { word: 'M · AI · Fit', text: 'My AI Fit: trợ lý AI cho việc tập luyện và ăn uống của riêng bạn.' },
    { word: 'Mai', text: 'Trong tiếng Việt, mai là ngày mai. Chữ M là ngọn núi, mặt trời mọc sau núi là ngày mai bạn fit hơn.' },
  ];
  return (
    <section id="vi-sao-maifit" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-10 px-5 pt-20 md:px-8 md:pt-28 lg:grid-cols-2 lg:gap-16">
      <div className="grid gap-6">
        <Reveal className="flex items-center gap-4">
          <LogoMark className="size-14 md:size-16" />
          <h2 className="font-display text-4xl font-bold md:text-5xl">Vì sao là MAIFit?</h2>
        </Reveal>
        <dl className="grid gap-5">
          {parts.map(({ word, text }, i) => (
            <Reveal key={word} delay={0.1 + i * 0.12} className="grid gap-1">
              <dt className="font-display text-2xl font-bold text-accent">{word}</dt>
              <dd className="max-w-[56ch] text-lg text-muted">{text}</dd>
            </Reveal>
          ))}
        </dl>
        <Reveal delay={0.35}><p className="max-w-[56ch] text-lg">
          Vì vậy MAIFit đếm chuỗi ngày tập của bạn, không đi tìm một buổi tập thần kỳ. Fit là chuyện của từng ngày.
        </p></Reveal>
      </div>
      <Reveal delay={0.15} className="w-full max-w-md justify-self-center lg:justify-self-end"><StreakPreview /></Reveal>
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
      <Reveal><h2 className="font-display text-4xl font-bold md:text-5xl">Bảng giá</h2></Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal delay={0.1} className="grid"><PlanCard title="Miễn phí" price="0đ" unit="mãi mãi" items={free}
          action={<ButtonLink to="/register" variant="secondary" className="w-full">Bắt đầu miễn phí</ButtonLink>} /></Reveal>
        <Reveal delay={0.25} className="grid"><PlanCard dark title={<><Crown aria-hidden="true" className="size-5 text-gold" /> Premium</>}
          price={p ? formatVnd(p.price) : 'Premium'} unit={p ? `${p.days} ngày, không tự gia hạn` : 'giá hiện khi tải được bảng giá'} items={premium}
          action={<ButtonLink to="/register" className="w-full">Tạo tài khoản rồi nâng cấp</ButtonLink>} /></Reveal>
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
