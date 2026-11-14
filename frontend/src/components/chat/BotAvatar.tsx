// No bot icon yet: put the file in public/brand/ and set its path here, e.g. '/brand/mbotfit.svg'
const BOT_ICON_SRC: string | null = null;

// MBotFit's picture. Decorative: the name "MBotFit" is always written next to it.
// className sets the size and the text size of the "MB" placeholder, e.g. "size-12 text-[17px]".
export function BotAvatar({ className = 'size-8 text-[11px]' }: { className?: string }) {
  if (BOT_ICON_SRC) {
    return <img src={BOT_ICON_SRC} alt="" aria-hidden="true" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-accent bg-soft font-display font-bold text-link ${className}`}>
      MB
    </span>
  );
}
