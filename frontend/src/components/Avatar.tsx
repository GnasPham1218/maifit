import { Crown } from 'lucide-react';

interface AvatarProps {
  name: string; // for the initial and the accessible name
  size?: number; // px
  premium?: boolean; // blue-gold ring + crown badge
  src?: string | null; // a photo later (Google sign-in); the initial until then
}

// Normal: a thin grey ring. Premium: a gold-blue ring and a gold crown badge, readable even at 36 px.
// The ring color is decoration; "Premium" is also in the accessible name, never in the color alone.
export function Avatar({ name, size = 48, premium = false, src = null }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const ring = premium ? Math.max(3, Math.round(size * 0.07)) : 2;
  const badge = Math.round(size * 0.38);
  const face = src ? (
    <img src={src} alt="" className="size-full rounded-full object-cover" />
  ) : (
    <span className="flex size-full items-center justify-center rounded-full bg-[#3a4a6b] font-display font-semibold text-white"
      style={{ fontSize: Math.round(size * 0.42) }}>
      {initial}
    </span>
  );
  return (
    <span role="img" aria-label={premium ? `${name}, thành viên Premium` : name}
      className={`relative inline-flex shrink-0 rounded-full ${premium ? 'bg-[conic-gradient(from_200deg,var(--color-gold),var(--color-accent),#7ea6ff,var(--color-gold))]' : 'bg-line'}`}
      style={{ width: size, height: size, padding: ring }}>
      <span className="size-full rounded-full bg-surface p-0.5">{face}</span>
      {premium && (
        <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-surface bg-gold"
          style={{ width: badge, height: badge }}>
          <Crown className="text-[#1c1e24]" style={{ width: badge * 0.6, height: badge * 0.6 }} strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
