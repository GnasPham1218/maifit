import { Ban, Info, Search, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { allergenApi } from '../../../apis/allergenApi';
import { foodApi } from '../../../apis/foodApi';
import { allergenIcon } from '../../../constants/allergenIcons';
import { EXCLUDED_SEARCH_ID, MAX_EXCLUDED_FOODS, type Choice } from '../../../constants/profile';
import type { Allergen, ExcludedFood } from '../../../types/profile';
import type { Food } from '../../../types/meal';
import { searchFoods } from '../../../utils/foodSearch';
import { Chip } from '../../Chip';
import { ReportMissingFood } from '../../ReportMissingFood';
import { FIELD_CONTROL, FIELD_LABEL } from '../../fieldStyles';

// "Vì sao MAIFit hỏi?": every coach question says what the answer is used for
export function WhyNote({ title = 'Vì sao MAIFit hỏi?', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-soft text-link">
        <Info className="size-3.5" />
      </span>
      <div className="grid gap-0.5">
        <p className="text-xs font-semibold tracking-wide text-link uppercase">{title}</p>
        <p className="text-sm leading-relaxed text-ink/85">{children}</p>
      </div>
    </div>
  );
}

export function OptionalTag({ children = 'Không bắt buộc' }: { children?: ReactNode }) {
  return <span className="ml-2 rounded-full border border-line px-2 py-px text-[11px] font-medium text-muted">{children}</span>;
}

// A labelled group of controls (role=group, the label names it)
export function FieldGroup({ id, label, optional, children }: { id: string; label: ReactNode; optional?: boolean; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="grid min-w-0 gap-2">
      <p id={id} className={FIELD_LABEL}>{label}{optional && <OptionalTag />}</p>
      {children}
    </div>
  );
}

interface ChoiceProps<T extends string> {
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

// Big option cards with a hint line (goal, experience). One can be picked (radio).
export function ChoiceCards<T extends string>({ choices, value, onChange, columns = 'sm:grid-cols-2 lg:grid-cols-3' }:
  ChoiceProps<T> & { columns?: string }) {
  return (
    <div role="radiogroup" className={`grid gap-2.5 ${columns}`}>
      {choices.map((c) => {
        const selected = c.value === value;
        return (
          <button key={c.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(c.value)}
            className={`grid cursor-pointer gap-0.5 rounded-2xl border-2 px-4 py-3 text-left transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected ? 'border-accent bg-soft' : 'border-line hover:border-muted'}`}>
            <span className="font-semibold">{c.label}</span>
            {c.hint && <span className="text-[13px] text-muted">{c.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Short choices as chips (activity, training type, diet). One can be picked.
export function ChipChoices<T extends string>({ choices, value, onChange }: ChoiceProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((c) => (
        <Chip key={c.value} selected={c.value === value} onClick={() => onChange(c.value)}>{c.label}</Chip>
      ))}
    </div>
  );
}

// Thin wrapper so the coach forms share one input look; the unit sits inside the field on the right
export function NumberInput({ id, label, value, onChange, unit, min, max, step = '0.1', optional, required, hint }: {
  id: string; label: string; value: string; onChange: (v: string) => void; unit: string;
  min: number; max: number; step?: string; optional?: boolean; required?: boolean; hint?: string;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>{label}{optional && <OptionalTag />}</label>
      <div className="relative">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} required={required}
          value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CONTROL} pr-12`}
          aria-describedby={hint ? `${id}-hint` : undefined} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

// The allergen groups as tiles with a picture and examples. Checked = red ("tránh"), like the warning tags.
export function AllergenChecklist({ value, onChange, columns = 'sm:grid-cols-2 lg:grid-cols-3' }: {
  value: string[]; onChange: (codes: string[]) => void; columns?: string;
}) {
  const [items, setItems] = useState<Allergen[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    allergenApi.list()
      .then((data) => { if (!ignore) setItems(data); })
      .catch(() => { if (!ignore) setFailed(true); });
    return () => { ignore = true; };
  }, []);

  if (failed) return <p className="text-sm text-danger">Chưa tải được danh sách dị ứng. Thử tải lại trang.</p>;
  if (!items) return <p className="text-sm text-muted">Đang tải…</p>;

  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <div className={`grid gap-2 ${columns}`}>
      {items.map((a) => {
        const checked = value.includes(a.code);
        const Icon = allergenIcon(a.code);
        return (
          <label key={a.code}
            className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5 transition-colors
              has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
              checked ? 'border-danger/70 bg-danger-bg' : 'border-line bg-surface hover:border-muted'}`}>
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(a.code)} />
            <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              checked ? 'bg-danger text-white' : 'bg-soft text-link'}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="grid min-w-0 flex-1">
              <span className={`text-sm font-semibold ${checked ? 'text-danger' : ''}`}>{a.name}</span>
              <span className="truncate text-xs text-muted" title={a.examples}>{a.examples}</span>
            </span>
            {checked && (
              <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">Tránh</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

// A tinted block inside a card, so the three parts of "Ăn uống và dị ứng" read apart at a glance
export type PanelTone = 'good' | 'danger' | 'warn';
const PANEL_TONES: Record<PanelTone, { box: string; icon: string }> = {
  good: { box: 'border-good/30 bg-success-bg/50', icon: 'bg-success-bg text-good' },
  danger: { box: 'border-danger/25 bg-danger-bg/40', icon: 'bg-danger-bg text-danger' },
  warn: { box: 'border-warn/30 bg-warn-bg/50', icon: 'bg-warn-bg text-warn' },
};

export function TonePanel({ icon: Icon, tone, title, hint, right, id, children }: {
  icon: LucideIcon; tone: PanelTone; title: string; hint?: string; right?: ReactNode; id?: string; children: ReactNode;
}) {
  const t = PANEL_TONES[tone];
  return (
    <section id={id} className={`grid min-w-0 scroll-mt-6 gap-3.5 rounded-2xl border p-4 md:p-5 ${t.box}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="size-[18px]" />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-semibold">{title}</h3>
          {hint && <p className="text-[13px] text-muted">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

// Option cards with a picture (diet, suggestion style). tone: the color of the picked card.
export function IconChoiceCards<T extends string>({ choices, icons, value, onChange, tone = 'accent', columns = 'grid-cols-1 sm:grid-cols-3' }:
  ChoiceProps<T> & { icons: Record<T, LucideIcon>; tone?: 'accent' | 'good'; columns?: string }) {
  const on = tone === 'good' ? 'border-good bg-success-bg' : 'border-accent bg-soft';
  const iconOn = tone === 'good' ? 'bg-good text-white' : 'bg-accent text-on-accent';
  return (
    <div role="radiogroup" className={`grid gap-2.5 ${columns}`}>
      {choices.map((c) => {
        const selected = c.value === value;
        const Icon: LucideIcon = icons[c.value];
        return (
          <button key={c.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(c.value)}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-2.5 text-left transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected ? on : 'border-line hover:border-muted'}`}>
            <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selected ? iconOn : 'bg-ground text-muted'}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="grid min-w-0">
              <span className="text-sm font-semibold">{c.label}</span>
              {c.hint && <span className="text-xs text-muted">{c.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AllergenDisclaimer() {
  return (
    <p className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-[13px] leading-relaxed text-danger">
      <span aria-hidden="true" className="font-bold">!</span>
      <span>
        MAIFit lọc theo dữ liệu món, không thay cho bác sĩ. Món đóng gói vẫn cần xem nhãn.{' '}
        <Link to="/about/allergens" className="font-semibold text-danger underline hover:text-danger">Mỗi nhóm gồm những gì?</Link>
      </span>
    </p>
  );
}

// "Món không ăn được / không thích": search by name; the backend keeps the RAW row of that food,
// so one pick excludes every preparation
export function ExcludedFoodsPicker({ value, onChange }: { value: ExcludedFood[]; onChange: (foods: ExcludedFood[]) => void }) {
  const [rows, setRows] = useState<Food[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let ignore = false;
    foodApi.listAll().then((data) => { if (!ignore) setRows(data); }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  const byName = useMemo(() => {
    const map = new Map<string, Food[]>();
    for (const r of rows ?? []) map.set(r.name, [...(map.get(r.name) ?? []), r]);
    return map;
  }, [rows]);

  const chosen = new Set(value.map((f) => f.name));
  const hits = query.trim() === '' ? [] : searchFoods(byName, query).filter((h) => !chosen.has(h.name)).slice(0, 6);
  const full = value.length >= MAX_EXCLUDED_FOODS;

  function add(name: string) {
    const row = (byName.get(name) ?? []).find((r) => r.preparation === 'RAW') ?? byName.get(name)?.[0];
    if (!row || full) return;
    onChange([...value, { id: row.id, name }].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
    setQuery('');
  }

  return (
    <div className="grid gap-2.5">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <input id={EXCLUDED_SEARCH_ID} type="search" value={query} onChange={(e) => setQuery(e.target.value)} disabled={full}
          aria-label="Tìm món để thêm" placeholder={full ? `Tối đa ${MAX_EXCLUDED_FOODS} món` : 'Tìm món, ví dụ: mắm tôm'}
          className={`${FIELD_CONTROL} bg-surface pl-10`} />
      </div>
      {hits.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {hits.map((h) => (
            <li key={h.name}>
              <button type="button" onClick={() => add(h.name)}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm hover:bg-soft
                  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                <span>{h.name}{h.alias && <span className="text-muted"> · {h.alias}</span>}</span>
                <span className="font-semibold text-warn">+ Không ăn</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() !== '' && rows && hits.length === 0 && (
        <div className="grid gap-2 rounded-xl border border-dashed border-line p-3.5">
          <p className="text-sm">
            MAIFit chưa có món “{query.trim()}”, nên <b>sẽ không bao giờ gợi ý món này</b> cho bạn. Báo thiếu món để được
            thêm vào dữ liệu, sau đó bạn chọn nó ở đây.
          </p>
          <ReportMissingFood key={query} name={query} />
        </div>
      )}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Món đã chọn">
          {value.map((f) => (
            <li key={f.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-warn/50 bg-surface py-1 pr-1 pl-3 text-sm">
              <Ban aria-hidden="true" className="size-3.5 text-warn" />
              {f.name}
              <button type="button" aria-label={`Bỏ ${f.name}`} onClick={() => onChange(value.filter((x) => x.id !== f.id))}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-warn-bg hover:text-ink
                  focus-visible:outline-2 focus-visible:outline-accent">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length === 0 && query.trim() === '' && <p className="text-sm text-muted">Chưa có món nào. Gõ tên món để thêm.</p>}
    </div>
  );
}
