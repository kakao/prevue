import { useState, type AnimationEvent } from 'react';

export function useVeil(shown: boolean, ready: boolean) {
  const [on, setOn] = useState(false);
  if (shown && !ready && !on) setOn(true);
  if (!shown && on) setOn(false);
  return { on, done: () => setOn(false) };
}

export function Veil({ ready, className, onDone }: { ready: boolean; className?: string; onDone(): void }) {
  const end = (e: AnimationEvent<HTMLSpanElement>) => { if (ready && e.animationName === 'gveil-out') onDone(); };
  return <span className={className ? `gveil ${className}` : 'gveil'} data-phase={ready ? 'clear' : 'wait'} aria-hidden="true"
    onAnimationEnd={end} />;
}
