import { useState, type AnimationEvent } from 'react';

export function Veil({ shown = true, ready, className }: { shown?: boolean; ready: boolean; className?: string }) {
  const [on, setOn] = useState(false);
  if (shown && !ready && !on) setOn(true);
  if (!shown && on) setOn(false);
  if (!on) return null;
  const end = (e: AnimationEvent<HTMLSpanElement>) => { if (ready && e.animationName === 'gveil-out') setOn(false); };
  return <span className={className ? `gveil ${className}` : 'gveil'} data-phase={ready ? 'clear' : 'wait'} aria-hidden="true" onAnimationEnd={end} />;
}
