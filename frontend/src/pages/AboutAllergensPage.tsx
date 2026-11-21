import { ArrowLeft, Ban, Check, ChevronDown, Info, Lock, ShieldAlert, Tags, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { allergenApi } from '../apis/allergenApi';
import { AllergenTag } from '../components/AllergenTag';
import { ButtonLink } from '../components/ButtonLink';
import { Logo } from '../components/brand/Logo';
import { allergenIcon } from '../constants/allergenIcons';
import { EXCLUDED_ANCHOR } from '../constants/profile';
import { useAuth } from '../hooks/useAuth';
import type { Allergen } from '../types/profile';

// Groups the app does not offer, and why (kept here: they are not rows in the database)
const MISSING: [string, string][] = [
  ['Mù tạt, đậu lupin, kiều mạch', 'Chưa có món nào trong dữ liệu thuộc các nhóm này. Một ô tích không lọc được gì sẽ tạo cảm giác an toàn sai, nên sẽ thêm khi app có món như mì soba hay nước chấm mù tạt.'],
  ['Côn trùng, nhộng', 'Dị ứng chéo với tôm cua là có thật, nhưng dữ liệu chưa có món côn trùng.'],
  ['Bột ngọt (MSG)', 'Bột ngọt không phải chất gây dị ứng; các nghiên cứu có đối chứng chưa chứng minh “hội chứng nhà hàng Trung Hoa”.'],
  ['Họ cà, thịt đỏ, đồ cay, hành tỏi, lactose…', 'Phần lớn là không dung nạp hoặc phản ứng riêng từng người. Thêm đúng món đó vào danh sách Món không ăn sẽ chính xác hơn chặn cả một nhóm.'],
];

// Questions about avoiding one food (shown with the button that opens that list in the profile)
const FAQ: [string, string][] = [
  ['Tôi muốn tránh một món cụ thể thì làm sao?', 'Bấm nút bên dưới: trang Hồ sơ huấn luyện mở thẳng ô tìm món ở mục “Món không ăn được / không thích”. Gõ tên món rồi bấm “+ Không ăn”, sau đó bấm Lưu. Mọi cách chế biến của món đó (sống, luộc, nướng…) đều bị loại khỏi gợi ý.'],
  ['Món tôi không ăn được mà MAIFit chưa có thì sao?', 'MAIFit chỉ gợi ý món có trong dữ liệu của app, nên món chưa có sẽ không bao giờ được gợi ý cho bạn. Khi tìm không thấy, bấm “Báo thiếu món” ngay dưới ô tìm: món được thêm khi có số liệu từ nguồn tin cậy, lúc đó bạn chọn nó vào danh sách.'],
];

// /about/allergens: how allergen labels work, the groups, and what the app cannot know. Public page.
export default function AboutAllergensPage() {
  const { status } = useAuth();
  const [groups, setGroups] = useState<Allergen[] | null>(null);
  const [failed, setFailed] = useState(false);
  const loggedIn = status === 'authenticated';

  useEffect(() => {
    let ignore = false;
    allergenApi.list()
      .then((data) => { if (!ignore) setGroups(data); })
      .catch(() => { if (!ignore) setFailed(true); });
    return () => { ignore = true; };
  }, []);

  const count = groups?.length ?? 13;

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-ground/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to={loggedIn ? '/profile?tab=coach' : '/'} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft aria-hidden="true" className="size-4" /> {loggedIn ? 'Hồ sơ huấn luyện' : 'Trang chủ'}
          </Link>
          <Logo className="text-xl" />
        </div>
      </header>

      <article className="mx-auto grid max-w-4xl gap-12 px-4 pt-8 pb-16 md:px-6 md:pt-10">
        <header className="relative grid gap-5 overflow-hidden rounded-card border border-danger/20 bg-danger-bg/60 p-6 md:p-8">
          <ShieldAlert aria-hidden="true" className="pointer-events-none absolute -top-6 -right-6 size-40 text-danger/10 md:size-56" />
          <span className="inline-flex items-center gap-2 justify-self-start rounded-full bg-surface px-3 py-1 text-xs font-semibold text-danger">
            <ShieldAlert aria-hidden="true" className="size-3.5" /> An toàn thực phẩm
          </span>
          <div className="relative grid gap-3">
            <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">Dị ứng trong MAIFit</h1>
            <p className="max-w-2xl text-ink/80 md:text-lg">
              Bạn tích nhóm dị ứng trong hồ sơ, MAIFit loại các món đó khỏi gợi ý và cảnh báo khi bạn xem hoặc ghi món.
              Đây là cách app gắn nhãn, và những gì app không biết.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-2.5 md:gap-3">
            <Stat value={String(count)} label="nhóm dị ứng để chọn" tone="text-danger" />
            <Stat value="2" label="mức cảnh báo trên món" tone="text-warn" />
            <Stat value="0" label="thông tin dị ứng trong hồ sơ gửi cho AI" tone="text-good" />
          </div>
          {loggedIn && (
            <ButtonLink to="/profile?tab=coach" className="relative justify-self-start">
              <ShieldAlert aria-hidden="true" className="size-4" /> Chọn dị ứng của bạn
            </ButtonLink>
          )}
        </header>

        <Section icon={Tags} title="Hai loại nhãn bạn sẽ thấy">
          <div className="grid gap-3.5 md:grid-cols-2">
            <LevelCard tone="border-danger/40 bg-danger-bg/50" tag={<AllergenTag level="CONTAINS" name="Sữa" />} title="Chắc chắn có"
              text="Thành phần chính của món luôn có nhóm này." food="Sữa chua có đường" meta="100 g · Sữa và chế phẩm" />
            <LevelCard tone="border-warn/50 border-dashed bg-warn-bg/50" tag={<AllergenTag level="MAY_CONTAIN" name="Lúa mì" />} title="Tuỳ sản phẩm"
              text="Có loại có, có loại không, tuỳ nhà sản xuất. Hãy xem nhãn bao bì." food="Nước tương" meta="15 ml · Gia vị" />
          </div>
          <p className="flex gap-2.5 rounded-2xl bg-soft px-4 py-3 text-sm">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
            <span>
              Với dị ứng, “có thể” cũng là không an toàn, nên <b>cả hai loại đều bị ẩn khỏi gợi ý</b>. Bạn vẫn ghi được món nếu
              đã ăn: app chỉ cảnh báo, không chặn.
            </span>
          </p>
        </Section>

        <Section icon={ShieldAlert} title={`${count} nhóm dị ứng`} lead="Khớp đúng với các ô tích trong hồ sơ.">
          {failed && <p className="text-sm text-danger">Chưa tải được danh sách. Thử tải lại trang.</p>}
          {!groups && !failed && <p className="text-sm text-muted">Đang tải…</p>}
          {groups && (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => {
                const Icon = allergenIcon(g.code);
                return (
                  <li key={g.code} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-danger/40">
                    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-danger-bg text-danger">
                      <Icon className="size-5" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="font-semibold">{g.name}</span>
                      <span className="text-[13px] leading-relaxed text-muted">{g.examples}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section icon={Info} title="Cách MAIFit gắn nhãn">
          <ol className="relative grid gap-6 rounded-card bg-surface p-5 md:p-7">
            <span aria-hidden="true" className="absolute top-9 bottom-9 left-[33px] w-0.5 bg-line md:left-[41px]" />
            <Rule n={1} text="Gắn theo nguyên liệu chính của món, rồi kiểm tra lại bằng tay." />
            <Rule n={2} text="Một món có thể thuộc nhiều nhóm." example="Mì trứng"
              tags={[['CONTAINS', 'Lúa mì'], ['CONTAINS', 'Gluten'], ['CONTAINS', 'Trứng']]} />
            <Rule n={3} text="Thà gắn dư còn hơn sót: món thường có thì vẫn gắn." example="Socola đen"
              tags={[['CONTAINS', 'Sữa'], ['MAY_CONTAIN', 'Đậu nành']]} />
            <Rule n={4} text="Lúa mì và Gluten là hai nhóm riêng: người dị ứng lúa mì có thể uống bia (lúa mạch), người bệnh Celiac thì không."
              example="Bia" tags={[['CONTAINS', 'Gluten'], ['CONTAINS', 'Sulfite']]} />
          </ol>
        </Section>

        <Section icon={Ban} title="Vì sao không có nhóm…" lead="Bấm vào từng dòng để xem lý do.">
          <div className="grid gap-2">
            {MISSING.map(([name, why]) => (
              <details key={name} className="group rounded-2xl border border-line bg-surface open:border-warn/50">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold
                  focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                  {name}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{why}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section icon={Ban} title="Tránh một món cụ thể">
          <div className="grid gap-2">
            {FAQ.map(([q, answer]) => (
              <details key={q} open className="group rounded-2xl border border-warn/40 bg-warn-bg/50">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold
                  focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-ink/80">{answer}</p>
              </details>
            ))}
          </div>
          <ButtonLink to={loggedIn ? `/profile?tab=coach#${EXCLUDED_ANCHOR}` : '/login'} className="justify-self-start">
            <Ban aria-hidden="true" className="size-4" /> {loggedIn ? 'Tránh một món cụ thể' : 'Đăng nhập để chọn món cần tránh'}
          </ButtonLink>
        </Section>

        <div className="grid gap-3.5 md:grid-cols-2">
          <section className="grid content-start gap-3 rounded-card border border-warn/40 bg-warn-bg/60 p-5 md:p-6">
            <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold">
              <TriangleAlert aria-hidden="true" className="size-6 text-warn" /> App không biết
            </h2>
            <Point mark="–" tone="text-warn">Món bị <b>nhiễm chéo</b> khi chế biến ở quán hay nhà máy.</Point>
            <Point mark="–" tone="text-warn">Gia vị, nước sốt đi kèm và thành phần thật của sản phẩm bạn đang cầm.</Point>
            <p className="border-t border-warn/30 pt-3 text-sm text-ink/75">
              Nhãn chỉ để tham khảo, không thay cho việc đọc bao bì. Dị ứng nặng, hãy hỏi ý kiến bác sĩ.
            </p>
          </section>
          <section className="grid content-start gap-3 rounded-card border border-good/30 bg-success-bg/60 p-5 md:p-6">
            <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold">
              <Lock aria-hidden="true" className="size-6 text-good" /> Quyền riêng tư
            </h2>
            <Point>Chỉ bạn thấy thông tin dị ứng của mình.</Point>
            <Point>
              <b>Danh sách dị ứng trong hồ sơ không gửi cho AI</b>: máy chủ MAIFit tự loại món trước khi MBotFit trả lời.
              Những gì bạn tự gõ trong khung chat vẫn được gửi như tin nhắn bình thường.
            </Point>
            <Point>Không hiện cho bạn bè hay trên bảng xếp hạng.</Point>
            <Point>Bị xoá cùng tài khoản.</Point>
          </section>
        </div>
      </article>
    </div>
  );
}

function Section({ icon: Icon, title, lead, children }: { icon: LucideIcon; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-link">
          <Icon className="size-5" />
        </span>
        <div className="grid">
          <h2 className="font-display text-2xl font-semibold md:text-[1.75rem]">{title}</h2>
          {lead && <p className="text-sm text-muted">{lead}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm md:px-5 md:py-4">
      <p className={`font-display text-3xl font-bold tabular-nums md:text-4xl ${tone}`}>{value}</p>
      <p className="text-xs leading-snug text-muted md:text-sm">{label}</p>
    </div>
  );
}

function LevelCard({ tone, tag, title, text, food, meta }: {
  tone: string; tag: ReactNode; title: string; text: string; food: string; meta: string;
}) {
  return (
    <div className={`grid content-start gap-3.5 rounded-card border-2 p-5 ${tone}`}>
      <div>{tag}</div>
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-soft font-display text-link">{food[0]}</span>
        <div>
          <p className="text-sm font-semibold">{food}</p>
          <p className="text-xs text-muted">{meta}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Ban aria-hidden="true" className="size-4 text-link" /> Không xuất hiện trong gợi ý món
      </p>
    </div>
  );
}

function Rule({ n, text, example, tags = [] }: {
  n: number; text: string; example?: string; tags?: ['CONTAINS' | 'MAY_CONTAIN', string][];
}) {
  return (
    <li className="relative flex gap-3.5">
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm text-on-accent ring-4 ring-surface">{n}</span>
      <div className="grid gap-2">
        <p>{text}</p>
        {example && (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-muted">{example}</span>
            {tags.map(([level, name]) => <AllergenTag key={name} level={level} name={name} />)}
          </p>
        )}
      </div>
    </li>
  );
}

function Point({ mark, tone = 'text-good', children }: { mark?: string; tone?: string; children: ReactNode }) {
  return (
    <p className="flex gap-2.5 text-[15px] leading-relaxed">
      <span aria-hidden="true" className={`shrink-0 font-bold ${tone}`}>{mark ?? <Check className="mt-1 size-4" />}</span>
      <span>{children}</span>
    </p>
  );
}
