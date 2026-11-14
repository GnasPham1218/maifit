// Robot head flexing both arms, already cut to a circle (256 px, enough for 2x screens).
// Set to null to fall back to the "MB" placeholder.
const BOT_ICON_SRC: string | null = '/brand/mbotfit.webp';

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
