import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';

const ParticleCanvas = dynamic(() => import('../canvas/ParticleCanvas'), { ssr: false });

const NAME_LINES = ['LIAM', 'BRIAN', 'ROBINSON', 'HOUNSELL'];

export default function HeroSection() {
  const headingRef  = useRef<HTMLHeadingElement>(null);
  const subRef      = useRef<HTMLDivElement>(null);
  const badgeRef    = useRef<HTMLParagraphElement>(null);
  const ctaRef      = useRef<HTMLDivElement>(null);
  const dividerRef  = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chars = headingRef.current?.querySelectorAll<HTMLElement>('.h-char');
    if (!chars?.length) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.from(badgeRef.current, { opacity: 0, y: 18, duration: 0.65, delay: 0.15 })
        .from(chars,            { y: 120, opacity: 0, duration: 0.85, stagger: 0.022 }, '-=0.3')
        .from(dividerRef.current, { scaleX: 0, duration: 0.7, ease: 'power3.inOut', transformOrigin: 'left' }, '-=0.5')
        .from(subRef.current,   { opacity: 0, y: 22, duration: 0.75 }, '-=0.4')
        .from(ctaRef.current,   { opacity: 0, y: 18, duration: 0.65 }, '-=0.45')
        .from(scrollRef.current, { opacity: 0, duration: 0.5 }, '-=0.2');
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      {/* Three.js canvas */}
      <ParticleCanvas />

      {/* Layered overlays */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 50%, transparent 30%, rgba(7,7,7,0.7) 75%, #070707 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
        style={{ height: '35vh', background: 'linear-gradient(to bottom, transparent, #070707)' }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-6xl px-8 md:px-12">
        {/* Badge */}
        <p
          ref={badgeRef}
          className="mb-5 font-mono text-[10px] tracking-[0.4em] uppercase text-accent opacity-0"
          style={{ animation: 'none' }}
        >
          <span className="mr-3 inline-block h-px w-6 translate-y-[-1px] bg-accent align-middle" />
          Software Engineering · Melbourne, AU
        </p>

        {/* Heading */}
        <h1
          ref={headingRef}
          className="font-display font-black leading-[0.88] tracking-[-0.025em] text-white"
          style={{ fontSize: 'clamp(3.5rem, 12vw, 11rem)' }}
        >
          {NAME_LINES.map((word, wi) => (
            <span key={wi} className="block overflow-hidden">
              {/* First letter — accent colour */}
              <span className="h-char inline-block" style={{ color: 'var(--accent)' }}>
                {word[0]}
              </span>
              {/* Remaining letters — white */}
              {word.slice(1).split('').map((char, ci) => (
                <span key={ci} className="h-char inline-block">
                  {char}
                </span>
              ))}
            </span>
          ))}
        </h1>

        {/* Divider line */}
        <div
          ref={dividerRef}
          className="my-7 h-px w-full max-w-xs bg-white/12 origin-left"
          style={{ transform: 'scaleX(0)' }}
        />

        {/* Sub + CTAs */}
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div
            ref={subRef}
            className="max-w-md text-base leading-relaxed text-muted md:text-[1.05rem] opacity-0"
            style={{ animation: 'none' }}
          >
            <p>
              Full-stack engineer crafting cloud-backed products with{' '}
              <span className="text-fg/75">Next.js, Node, and SQL</span>. Calm complexity,
              polish UX, ship things that scale.
            </p>
          </div>

          <div
            ref={ctaRef}
            className="flex shrink-0 flex-wrap gap-3 opacity-0"
            style={{ animation: 'none' }}
          >
            <a
              href="#projects"
              className="group inline-flex items-center gap-2.5 bg-accent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-black transition-all duration-200 hover:bg-white"
            >
              View Work
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 border border-white/15 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fg/60 transition-all duration-200 hover:border-white/35 hover:text-fg"
            >
              Contact
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-10 right-10 z-20 flex flex-col items-center gap-3 opacity-0"
        style={{ animation: 'none' }}
      >
        <span
          className="font-mono text-[8px] tracking-[0.4em] uppercase text-muted"
          style={{ writingMode: 'vertical-rl' }}
        >
          Scroll to explore
        </span>
        <div
          className="w-px h-12 origin-top"
          style={{
            background: 'linear-gradient(to bottom, var(--accent), transparent)',
            animation: 'pulse-line 2.2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Corner accent — top-right */}
      <div className="pointer-events-none absolute top-0 right-0 z-20">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-10">
          <path d="M120 0V120H0" stroke="var(--accent)" strokeWidth="0.5"/>
          <path d="M120 40V120H40" stroke="var(--accent)" strokeWidth="0.5"/>
          <path d="M120 80V120H80" stroke="var(--accent)" strokeWidth="0.5"/>
        </svg>
      </div>
    </section>
  );
}
