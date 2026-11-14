import { BotPreview, CaloriePreview, RepPreview } from './Previews';

const TILE = 'min-w-0 rounded-[22px] bg-hero-ink/[0.06] p-5';

// Right side of the sign-in pages (lg+): one day in MAIFit, on the graphite panel. Facts only, no promises.
export function AuthShowcase() {
  return (
    <aside className="hidden min-w-0 flex-col gap-6 rounded-[32px] bg-hero p-10 text-hero-ink lg:flex" aria-label="Giới thiệu MAIFit">
      <p className="font-display text-[38px] leading-[1.12] font-semibold">
        Một ngày của bạn,<br /><span className="text-[#7ea6ff]">trong một màn hình.</span>
      </p>
      <div className="grid flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3.5">
        <RepPreview className="row-span-2 min-h-80" />
        <div className={`${TILE} flex items-center`}><CaloriePreview /></div>
        <div className={`${TILE} flex items-center`}>
          <BotPreview dark text="200 g cơm trắng là 260 kcal, tính từ bảng dữ liệu của MAIFit." source="USDA FoodData Central" />
        </div>
      </div>
      <dl className="flex justify-between gap-4 border-t border-hero-ink/10 pt-5">
        {[
          ['300+', 'món có số liệu USDA'],
          ['0', 'video gửi lên máy chủ'],
          ['100%', 'calo tính từ bảng, không do AI'],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-xs text-hero-muted">{label}</dt>
            <dd className="font-display text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
