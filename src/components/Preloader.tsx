import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface Props {
  onDone: () => void;
}

export default function Preloader({ onDone }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef     = useRef<HTMLDivElement>(null);
  const [num, setNum] = useState(0);

  useEffect(() => {
    const obj = { val: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        /* Wipe overlay up */
        gsap.to(overlayRef.current, {
          yPercent: -100,
          duration: 0.9,
          ease: 'power4.inOut',
          onComplete: onDone,
        });
      },
    });

    /* Count 0 → 100 */
    tl.to(obj, {
      val: 100,
      duration: 1.9,
      ease: 'power1.inOut',
      onUpdate() {
        const v = Math.round(obj.val);
        setNum(v);
        if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`;
      },
    });

    /* Small pause at 100 */
    tl.to({}, { duration: 0.18 });
  }, [onDone]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg"
      aria-label="Loading"
    >
      {/* Logo mark */}
      <div className="mb-10 font-display text-xs font-bold tracking-[0.4em] uppercase text-accent">
        LBRH
      </div>

      {/* Counter */}
      <span
        ref={counterRef}
        className="font-display text-[clamp(4rem,14vw,10rem)] font-black leading-none tracking-[-0.04em] text-fg tabular-nums"
      >
        {String(num).padStart(3, '0')}
      </span>

      {/* Progress bar */}
      <div className="mt-8 h-px w-48 bg-border overflow-hidden">
        <div
          ref={barRef}
          className="h-full w-full origin-left bg-accent"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.35em] text-muted">
        Loading experience
      </p>
    </div>
  );
}
