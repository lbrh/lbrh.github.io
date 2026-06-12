import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const ROLES = [
  {
    company:  'Royal Yacht Club of Victoria',
    role:     'Assistant Sailing Manager',
    period:   'Jan 2026 to Present',
    location: 'Williamstown, VIC · On-site',
    bullets: [
      'Supported event planning and delivery across regattas and club racing series.',
      'Coordinated race-day logistics: course setup, documentation, and volunteer coverage.',
      'Maintained digital tooling and race-management workflows to track participation data.',
    ],
  },
  {
    company:  'Telltale Solutions',
    role:     'Founder & Lead Developer',
    period:   'Nov 2024 to Present',
    location: 'Melbourne, VIC · Self-employed',
    link:     'https://telltalesolutions.com.au/',
    bullets: [
      'Founded to pair AI with competitive sailing decision support.',
      'Designed an automated umpire roadmap focused on accuracy and fairness in racing.',
      'Owned the full build cycle from concept through implementation as a solo developer.',
    ],
  },
  {
    company:  'HEX',
    role:     'Ambassador',
    period:   'Feb 2025 to Present',
    location: 'West Melbourne, VIC',
    bullets: [
      'Represented HEX at school fairs and digital channels, expanding reach to student audiences.',
      'Ran campus activations spanning workshops, webinars, and networking formats.',
    ],
  },
  {
    company:  'Community Sailing School Foundation',
    role:     'Website Developer',
    period:   'Oct 2022 to Present',
    location: 'Detroit, MI · Hybrid · Freelance',
    link:     'https://www.communitysailingschool.org',
    bullets: [
      'Designed and shipped a WordPress experience for 350+ sailors, coaches, and supporters.',
      'Ran Design Thinking sessions to shape sailor-friendly IA and content model.',
      'Rolled out ecommerce and LMS-style flows maintainable by non-developer staff.',
    ],
  },
  {
    company:  'Amazon Prime Air',
    role:     'Intern',
    period:   '2023',
    location: 'Seattle, WA',
    bullets: [
      'Studied distributed systems operated at drone-delivery scale, with emphasis on availability.',
      'Mapped how latency budgets and redundancy patterns keep customer promises intact.',
    ],
  },
];

export default function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /* Animated vertical timeline line */
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 65%',
            end: 'bottom 65%',
            scrub: true,
          },
        },
      );

      /* Each entry slides in */
      gsap.from('.exp-entry', {
        x: -50,
        opacity: 0,
        duration: 0.85,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 68%' },
      });

      /* Label */
      gsap.from('.exp-label', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        scrollTrigger: { trigger: el, start: 'top 80%' },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="mx-auto max-w-5xl px-6 py-28 md:py-40 md:px-12"
    >
      <p className="exp-label font-mono text-[10px] uppercase tracking-[0.35em] text-accent mb-12">
        03 — Experience
      </p>

      <h2 className="exp-label font-display text-[clamp(2.4rem,5vw,4rem)] font-black leading-[0.92] text-fg mb-16">
        Where I've worked
      </h2>

      <div className="relative pl-8 md:pl-12">
        {/* Vertical line */}
        <div
          ref={lineRef}
          className="absolute left-0 top-0 bottom-0 w-px origin-top"
          style={{ background: 'linear-gradient(to bottom, var(--accent), var(--purple), transparent)' }}
        />

        <div className="space-y-14">
          {ROLES.map((r, i) => (
            <div key={i} className="exp-entry relative">
              {/* Dot on timeline */}
              <div
                className="absolute -left-8 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-bg md:-left-12"
                style={{ boxShadow: '0 0 12px var(--accent)' }}
              />

              {/* Period */}
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent mb-1">
                {r.period}
              </p>

              {/* Company + role */}
              <div className="flex flex-wrap items-baseline gap-3 mb-1">
                <h3 className="font-display text-xl font-black text-fg md:text-2xl">
                  {r.link ? (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent transition-colors"
                    >
                      {r.company}
                    </a>
                  ) : (
                    r.company
                  )}
                </h3>
                <span className="text-sm text-muted">{r.role}</span>
              </div>

              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted/60 mb-4">
                {r.location}
              </p>

              {/* Bullets */}
              <ul className="space-y-2">
                {r.bullets.map((b, bi) => (
                  <li key={bi} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent/50" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
