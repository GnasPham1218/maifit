import { BookOpen, ExternalLink } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { foodApi } from '../../apis/foodApi';
import { MACROS, type MacroKey } from '../../constants/macros';
import { getErrorMessage } from '../../constants/errorMessages';
import { PREPARATION_LABELS } from '../../constants/meal';
import type { FoodDetails, FoodVariant } from '../../types/food';
import { energySplit } from '../../utils/energySplit';
import { formatNumber } from '../../utils/number';
import { BigNumber } from '../BigNumber';
import { SegmentedTabs } from '../SegmentedTabs';

interface FoodDetailsViewProps {
  id: number; // the preparation shown; its siblings come along in the same answer
  onSelect: (id: number) => void; // a tab was picked (the page changes the URL, a dialog keeps it in state)
  actions?: (variant: FoodVariant, details: FoodDetails) => ReactNode;
  wide?: boolean; // the page: two columns from lg. A dialog stays one column.
  titleAs?: 'h1' | 'h3'; // h1 on the page (it is the page title), h3 inside a dialog that has its own title
}

const value = (v: number | null) => (v == null ? 'chưa có' : formatNumber(v));

// One food, all its preparations, where the numbers come from. Used by the /foods/:id page AND inside
// the add / edit dialogs and the chat card, so opening it there never throws away what the user typed.
export function FoodDetailsView({ id, onSelect, actions, wide = false, titleAs: Title = 'h3' }: FoodDetailsViewProps) {
  const [details, setDetails] = useState<FoodDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    foodApi
      .details(id) // cached per id, and siblings share the answer: switching tabs does not refetch
      .then((data) => {
        if (!ignore) setDetails(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) return <p className="text-danger" role="alert">{error}</p>;
  const variant = details?.variants.find((v) => v.id === id);
  if (!details || !variant) return <p className="text-muted">Đang tải…</p>;

  const split = energySplit(variant.proteinG, variant.carbG, variant.fatG);
  const tiles: { key: MacroKey; grams: number | null }[] = [
    { key: 'protein', grams: variant.proteinG },
    { key: 'carb', grams: variant.carbG },
    { key: 'fat', grams: variant.fatG },
    { key: 'fiber', grams: variant.fiberG },
  ];
  const several = details.variants.length > 1;

  const hero = (
    <section aria-label={`Dinh dưỡng ${details.name} ${PREPARATION_LABELS[variant.preparation].toLowerCase()}`}
      className="grid gap-4 rounded-card bg-hero p-6 text-hero-ink">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <BigNumber value={variant.kcal} maximumFractionDigits={1} className="text-6xl leading-none md:text-7xl" />
        <span className="text-hero-muted">kcal trên 100 g phần ăn được</span>
      </p>
      {split && (
        <div role="img" className="flex h-3 gap-0.5 overflow-hidden rounded-full"
          aria-label={`Tỉ lệ năng lượng: đạm ${split.protein}%, carb ${split.carb}%, béo ${split.fat}%`}>
          {(['protein', 'carb', 'fat'] as const).map((k) => split[k] > 0 && (
            <span key={k} className={MACROS[k].swatch} style={{ flexGrow: split[k] }} />
          ))}
        </div>
      )}
      <dl className="grid grid-cols-4 gap-2">
        {tiles.map(({ key, grams }) => (
          <div key={key} className="grid min-w-0 gap-1">
            <dt className="flex items-center gap-1.5 text-xs text-hero-muted">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-sm ${MACROS[key].swatch}`} />
              {MACROS[key].label}
            </dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">
              {grams == null ? <span className="text-base font-normal text-hero-muted">chưa có</span> : <>{formatNumber(grams)}<span className="ml-0.5 font-sans text-xs font-normal text-hero-muted">g</span></>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );

  const compare = several && (
    <section aria-labelledby="compare-title" className="rounded-card bg-surface p-6">
      <h2 id="compare-title" className="text-lg font-semibold">So sánh cách chế biến</h2>
      <p className="mt-1 text-sm text-muted">
        Cùng 100 g. Khi nấu, món hút nước hoặc mất nước nên calo của 100 g đã nấu khác 100 g lúc sống.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-right text-sm tabular-nums">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-2 text-left font-medium">Cách</th>
              <th scope="col" className="font-medium">kcal</th>
              <th scope="col" className="font-medium">Đạm</th>
              <th scope="col" className="font-medium">Carb</th>
              <th scope="col" className="font-medium">Béo</th>
            </tr>
          </thead>
          <tbody>
            {details.variants.map((v) => (
              <tr key={v.id} className={`border-t border-line ${v.id === id ? 'font-semibold' : ''}`}
                aria-current={v.id === id ? 'true' : undefined}>
                <th scope="row" className={`py-2.5 text-left ${v.id === id ? 'font-semibold' : 'font-normal'}`}>{PREPARATION_LABELS[v.preparation]}</th>
                <td>{formatNumber(v.kcal)}</td>
                <td>{value(v.proteinG)}</td>
                <td>{value(v.carbG)}</td>
                <td>{value(v.fatG)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const source = (
    <section aria-labelledby="source-title" className="rounded-card bg-surface p-6">
      <h2 id="source-title" className="text-lg font-semibold">Nguồn số liệu</h2>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Nguồn</dt>
        <dd className="break-words">{variant.source}</dd>
        {variant.sourceDescription && (
          <>
            <dt className="text-muted">Tên gốc</dt>
            <dd lang="en" className="break-words">{variant.sourceDescription}</dd>
          </>
        )}
      </dl>
      {(variant.approximate || variant.estimated) && (
        <p className="mt-3 rounded-2xl border border-gold bg-gold/15 px-3 py-2 text-sm">
          {variant.estimated
            ? 'Ước tính: không có số đo trực tiếp, tính bằng tỉ lệ sống sang chín từ số đo USDA của món tương tự.'
            : 'Xấp xỉ: USDA không có đúng món Việt này, MAIFit dùng thực phẩm gần nhất.'}
        </p>
      )}
      {variant.sourceUrl && (
        <a href={variant.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
          <BookOpen aria-hidden="true" className="size-4" /> Xem trên USDA FoodData Central
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(mở tab mới)</span>
        </a>
      )}
      <p className="mt-3 text-xs text-muted">Thiếu số liệu ghi “chưa có”, không ghi 0.</p>
    </section>
  );

  return (
    <div className="grid gap-5">
      <Title className={Title === 'h1' ? 'font-display text-3xl font-bold tracking-wide md:text-4xl' : 'font-display text-2xl font-semibold'}>
        {details.name}
      </Title>
      {details.aliases.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Còn gọi:</span>
          {details.aliases.map((a) => (
            <span key={a} className="rounded-full bg-soft px-2.5 py-0.5 text-link">{a}</span>
          ))}
        </p>
      )}
      {several && (
        <SegmentedTabs label={`Cách chế biến ${details.name}`} value={String(id)}
          items={details.variants.map((v) => ({ id: String(v.id), label: PREPARATION_LABELS[v.preparation] }))}
          onChange={(v) => onSelect(Number(v))} />
      )}
      {wide ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid gap-5">{hero}{actions?.(variant, details)}{compare}</div>
          {source}
        </div>
      ) : (
        <>{hero}{actions?.(variant, details)}{compare}{source}</>
      )}
    </div>
  );
}
