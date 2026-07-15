import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const SKILLS = [
  { category: 'Frontend',  items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Three.js', 'GSAP', 'Framer Motion'] },
  { category: 'Backend',   items: ['Node.js', 'Express', 'Spring Boot', 'Python', 'FastAPI', 'PostgreSQL', 'SQLite'] },
  { category: 'Cloud',     items: ['AWS', 'Firebase', 'Supabase', 'Vercel', 'Docker', 'S3', 'Lambda'] },
  { category: 'Tools',     items: ['Git', 'GitHub', 'Figma', 'Postman', 'DataGrip', 'Jira', 'MediaPipe'] },
];

const SOFT = [
  'Scrum Master', 'Design Thinking', 'Systems Architecture',
  'Agile', 'Technical Writing', 'Code Review', 'Mentoring',
];

export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from('.skill-label', {
        opacity: 0, y: 20, duration: 0.7,
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });

      /* Category cards stagger in */
      gsap.from('.skill-card', {
        opacity: 0,
        y: 40,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.skill-grid', start: 'top 78%' },
      });

      /* Pill tags pop in */
      gsap.from('.skill-tag', {
        opacity: 0,
        scale: 0.85,
        duration: 0.4,
        stagger: 0.03,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.skill-grid', start: 'top 70%' },
      });

      /* Soft skills bar */
      gsap.from('.soft-item', {
        opacity: 0,
        x: -24,
        duration: 0.6,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.soft-grid', start: 'top 80%' },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="mx-auto max-w-7xl px-6 py-24 md:py-36 md:px-12"
    >
      <p className="skill-label font-mono text-[10px] uppercase tracking-[0.35em] text-accent mb-10">
        04 — Skills
      </p>

      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <h2 className="skill-label font-display text-[clamp(2rem,4.5vw,3.8rem)] font-black leading-[0.92] text-fg">
          The technical stack
        </h2>
        <p className="skill-label text-sm text-muted max-w-xs">
          Tools and technologies I reach for every day.
        </p>
      </div>

      {/* Tech grid */}
      <div className="skill-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SKILLS.map((cat, i) => (
          <div
            key={i}
            className="skill-card group relative overflow-hidden border border-border bg-surface p-6 transition-all duration-400 hover:border-white/10"
          >
            {/* Accent top strip */}
            <div
              className="absolute top-0 left-0 right-0 h-px bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: '0 0 20px 2px var(--accent)' }}
            />
            <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.28em] text-accent">
              {cat.category}
            </p>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <span
                  key={item}
                  className="skill-tag inline-block border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-all duration-200 hover:border-accent/40 hover:text-fg"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Soft skills */}
      <div className="soft-grid mt-12 border-t border-border pt-10">
        <p className="mb-5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted">
          Also fluent in
        </p>
        <div className="flex flex-wrap gap-3">
          {SOFT.map((s) => (
            <span
              key={s}
              className="soft-item inline-block border border-white/8 px-4 py-2 text-sm text-muted/80 transition-colors duration-200 hover:border-white/20 hover:text-fg"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
