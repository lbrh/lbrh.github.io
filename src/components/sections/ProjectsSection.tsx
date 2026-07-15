import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '@/data/projects';

const CARD_ACCENTS = ['#00e5c8', '#7c5cfc', '#f97316', '#3b82f6', '#ec4899', '#22c55e'];

/** Renders a project background image; silently hides itself if the file is missing */
function ProjectBg({ src, alt, isActive }: { src: string; alt: string; isActive: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-700"
      style={{ opacity: loaded ? (isActive ? 0.8 : 0.2) : 0 }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-8 transition-transform duration-700 group-hover:scale-105"
        sizes="480px"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(14,14,14,0.95) 30%, rgba(14,14,14,0.55) 70%, rgba(14,14,14,0.3) 100%)',
        }}
      />
    </div>
  );
}

/** Same for mobile cards */
function ProjectBgMobile({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <div
      className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-70"
      style={{ opacity: loaded ? undefined : 0 }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-6"
        sizes="100vw"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(14,14,14,0.97) 30%, rgba(14,14,14,0.6) 100%)',
        }}
      />
    </div>
  );
}

export default function ProjectsSection() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const wrap  = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const ctx = gsap.context(() => {
      gsap.from('.proj-label', {
        opacity: 0, y: 24, duration: 0.8,
        scrollTrigger: { trigger: wrap, start: 'top 82%' },
      });

      /* Desktop horizontal scroll */
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        const getAmt = () => -(track.scrollWidth - window.innerWidth + 96);

        gsap.to(track, {
          x: getAmt,
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: () => `+=${track.scrollWidth}`,
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="projects" ref={wrapRef}>

      {/* ── Desktop: GSAP horizontal pin + scroll ─────────── */}
      <div className="hidden md:block overflow-hidden">
        <div
          ref={trackRef}
          className="flex h-screen items-center gap-6 pl-[max(48px,6vw)]"
          style={{ width: 'max-content' }}
        >
          {/* Label column */}
          <div className="proj-label shrink-0 w-[240px] pr-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-accent mb-4">
              02 — Work
            </p>
            <h2 className="font-display text-5xl font-black leading-[0.92] text-fg">
              Selected<br />Projects
            </h2>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Drag or scroll to explore.
            </p>
          </div>

          {/* Cards */}
          {PROJECTS.map((p, i) => {
            const accent  = CARD_ACCENTS[i % CARD_ACCENTS.length];
            const isActive = active === i;

            return (
              <div
                key={p.title}
                className="shrink-0 relative h-[72vh] w-[480px] overflow-hidden border border-border bg-surface group transition-all duration-500 hover:border-white/15"
                style={{ maxWidth: '90vw' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {/* ── Background image (20 % → 80 % on hover) ── */}
                {p.image && (
                  <ProjectBg src={p.image} alt={p.title} isActive={isActive} />
                )}

                {/* Accent top line with glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-px transition-opacity duration-500"
                  style={{
                    background: accent,
                    opacity: isActive ? 1 : 0.3,
                    boxShadow: isActive ? `0 0 40px 4px ${accent}50` : 'none',
                  }}
                />

                {/* Ghost number */}
                <div
                  className="absolute top-6 right-8 font-display font-black leading-none select-none pointer-events-none"
                  style={{
                    fontSize: '7rem',
                    color: `${accent}${isActive ? '12' : '06'}`,
                    transition: 'color 0.5s',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Content — pinned to bottom */}
                <div className="relative z-10 flex h-full flex-col justify-end p-8">
                  <p
                    className="font-mono text-[9px] uppercase tracking-[0.3em] mb-3"
                    style={{ color: accent }}
                  >
                    {p.dates}
                  </p>

                  <h3 className="font-display text-3xl font-black leading-tight text-fg mb-1">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted mb-5">{p.org}</p>

                  {/* Bullets — slide in on hover */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: isActive ? '260px' : '0px', opacity: isActive ? 1 : 0 }}
                  >
                    <ul className="space-y-2 text-sm leading-relaxed text-muted/80 mb-5">
                      {p.bullets.slice(0, 3).map((b, bi) => (
                        <li key={bi} className="flex gap-2.5">
                          <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                            style={{ background: accent }}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Links */}
                  {p.links && p.links.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {p.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-200 hover:opacity-80"
                          style={{
                            borderColor: `${accent}40`,
                            color: accent,
                            background: isActive ? `${accent}10` : 'transparent',
                          }}
                        >
                          {l.label}
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 7L7 1M7 1H3M7 1V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* End spacer */}
          <div className="shrink-0 w-24" />
        </div>
      </div>

      {/* ── Mobile: vertical cards ──────────────────────────── */}
      <div className="md:hidden py-24 px-6">
        <p className="proj-label font-mono text-[10px] uppercase tracking-[0.35em] text-accent mb-4">
          02 — Work
        </p>
        <h2 className="font-display text-4xl font-black text-fg mb-12">
          Selected Projects
        </h2>

        <div className="space-y-6">
          {PROJECTS.map((p, i) => {
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
            return (
              <div
                key={p.title}
                className="relative overflow-hidden border border-border bg-surface p-6 group"
              >
                {/* Background image */}
                {p.image && (
                  <ProjectBgMobile src={p.image} alt={p.title} />
                )}

                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: accent }}
                />

                <div className="relative z-10">
                  <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-2" style={{ color: accent }}>
                    {p.dates}
                  </p>
                  <h3 className="font-display text-2xl font-black text-fg mb-1">{p.title}</h3>
                  <p className="text-sm text-muted mb-4">{p.org}</p>
                  <ul className="space-y-2 text-sm text-muted/80">
                    {p.bullets.slice(0, 2).map((b, bi) => (
                      <li key={bi} className="flex gap-2.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {p.links?.length && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {p.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 border px-3 py-1 text-[9px] font-semibold uppercase tracking-widest transition"
                          style={{ borderColor: `${accent}40`, color: accent }}
                        >
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
