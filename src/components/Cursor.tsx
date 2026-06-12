import { useEffect, useRef } from 'react';

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let raf: number;
    let hidden = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (hidden) {
        dot.style.opacity  = '1';
        ring.style.opacity = '1';
        hidden = false;
      }
    };

    const onLeave = () => {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
      hidden = true;
    };

    const onEnterInteractive = () => ring.classList.add('is-hovering');
    const onLeaveInteractive = () => ring.classList.remove('is-hovering');

    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);

    const attachDelegation = () => {
      document.querySelectorAll('a, button, [data-hover]').forEach((el) => {
        el.addEventListener('mouseenter', onEnterInteractive);
        el.addEventListener('mouseleave', onLeaveInteractive);
      });
    };
    attachDelegation();

    /* Observe DOM mutations to attach to new interactive elements */
    const observer = new MutationObserver(attachDelegation);
    observer.observe(document.body, { childList: true, subtree: true });

    const tick = () => {
      raf = requestAnimationFrame(tick);
      dot.style.transform  = `translate(${mx - 3}px, ${my - 3}px)`;
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.transform = `translate(${rx - 19}px, ${ry - 19}px)`;
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
    </>
  );
}
