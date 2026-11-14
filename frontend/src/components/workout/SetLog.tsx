import { Check, X } from 'lucide-react';
import { attemptText, type Attempt } from '../../utils/workoutDisplay';

// Newest first. onCamera: light text for the dark panel over the video
export function SetLog({ attempts, joint, onCamera = false, max }: { attempts: Attempt[]; joint: string; onCamera?: boolean; max?: number }) {
  const list = [...attempts].reverse().slice(0, max);
  return (
    <ol className="grid gap-2 text-sm">
      {list.map((a) => (
        <li key={a.seq} className={`flex items-start gap-2 ${a.ok ? (onCamera ? 'text-[#8fe3b0]' : 'text-good') : onCamera ? 'text-[#c9d2e6]' : 'text-muted'}`}>
          {a.ok
            ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.6} />
            : <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.6} />}
          {attemptText(a, joint)}
        </li>
      ))}
    </ol>
  );
}
