import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

const STATS = [
  { end: 7,    suffix: '+',  label: 'Years coding' },
  { end: 18,   suffix: '+',  label: 'Projects shipped' },
  { end: 3,    suffix: '+',  label: 'Hackathons podiumed' },
  { end: 1000, suffix: '+',  label: 'Hours spent sailing' },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const statsRef   = useRef<HTMLDivElement>(null);
  const headRef    = useRef<HTMLDivElement>(null);
  const bodyRef    = useRef<HTMLDivElement>(null);
  const imgRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /* Heading lines reveal */
      gsap.from('.about-line', {
        y: 70,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: { trigger: headRef.current, start: 'top 78%' },
      });

      /* Body text */
      gsap.from(bodyRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: bodyRef.current, start: 'top 80%' },
      });

      /* Image */
      gsap.from(imgRef.current, {
        opacity: 0,
        scale: 0.94,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: imgRef.current, start: 'top 78%' },
      });

      /* Stats count-up */
      const statEls = statsRef.current?.querySelectorAll<HTMLElement>('.stat-num');
      statEls?.forEach((el, i) => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: STATS[i].end,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: statsRef.current, start: 'top 75%' },
          onUpdate() {
            el.textContent = Math.floor(obj.val).toString();
          },
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="mx-auto max-w-7xl px-6 py-28 md:py-40 md:px-12"
    >
      {/* Label */}
      <p className="mb-12 font-mono text-[10px] uppercase tracking-[0.35em] text-accent">
        01 — About
      </p>

      <div className="grid gap-16 lg:grid-cols-[1fr_400px] lg:gap-24">
        {/* Left column */}
        <div>
          <div ref={headRef} className="overflow-hidden">
            <div className="about-line font-display text-[clamp(2.4rem,5vw,4.5rem)] font-black leading-[0.92] tracking-[-0.02em] text-fg">
              Turning messy
            </div>
            <div className="about-line font-display text-[clamp(2.4rem,5vw,4.5rem)] font-black leading-[0.92] tracking-[-0.02em] text-fg">
              problems into
            </div>
            <div className="about-line font-display text-[clamp(2.4rem,5vw,4.5rem)] font-black leading-[0.92] tracking-[-0.02em]">
              <span className="text-accent">elegant code.</span>
            </div>
          </div>

          <div ref={bodyRef} className="mt-10 space-y-5 text-base leading-relaxed text-muted md:text-[1.05rem]">
            <p>
              Software engineer with experience building full-stack, cloud-backed
              applications using Next.js, Spring Boot, Express, and SQL. I pair closely
              with the people using the product and ship solutions that stay fast and
              dependable as usage grows.
            </p>
            <p>
              Raised across the USA, China, and Australia, I gravitate toward
              collaborative teams built around hackathons, club leadership, and plenty
              of time on the water. Outside the terminal: sailing, bouldering, and
              the occasional coffee chat.
            </p>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            className="mt-14 grid grid-cols-2 gap-6 border-t border-border pt-10 sm:grid-cols-4"
          >
            {STATS.map((s, i) => (
              <div key={i}>
                <div className="font-display text-3xl font-black text-fg md:text-4xl">
                  <span className="stat-num">0</span>
                  <span className="text-accent">{s.suffix}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — photo with 3D tilt */}
        <div ref={imgRef} className="hidden lg:block">
          <div
            className="relative h-[480px] overflow-hidden border border-border transition-shadow duration-500 hover:shadow-[0_30px_80px_rgba(0,229,200,0.07)]"
            style={{ perspective: '800px' }}
            onMouseMove={(e) => {
              const el   = e.currentTarget;
              const r    = el.getBoundingClientRect();
              const px   = (e.clientX - r.left) / r.width  - 0.5;
              const py   = (e.clientY - r.top)  / r.height - 0.5;
              const inner = el.querySelector<HTMLElement>('.tilt-inner');
              if (inner) {
                inner.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 8}deg) scale(1.02)`;
              }
            }}
            onMouseLeave={(e) => {
              const inner = e.currentTarget.querySelector<HTMLElement>('.tilt-inner');
              if (inner) inner.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
            }}
          >
            <div
              className="tilt-inner absolute inset-0"
              style={{ transformStyle: 'preserve-3d', transition: 'transform 0.12s ease-out' }}
            >
              <Image
                src="/pfp.jpeg"
                alt="Liam Brian Robinson Hounsell"
                fill
                className="object-cover grayscale-[15%]"
                sizes="400px"
              />
              {/* Accent overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,229,200,0.07) 0%, rgba(124,92,252,0.04) 50%, transparent 70%)',
                }}
              />
              {/* Shine */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
                }}
              />
            </div>
          </div>
          {/* Caption */}
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60">
            Liam Brian Robinson Hounsell · Melbourne
          </p>
        </div>
      </div>
    </section>
  );
}
