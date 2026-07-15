import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'hero',       label: 'Home' },
  { id: 'about',      label: 'About' },
  { id: 'projects',   label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills',     label: 'Skills' },
  { id: 'contact',    label: 'Contact' },
];

export default function SectionDots() {
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const els = SECTIONS
      .map(s => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { threshold: 0.35 },
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="fixed right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3.5 xl:flex"
      aria-label="Section navigation"
    >
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-label={`Go to ${s.label}`}
            className="group flex items-center justify-end gap-2"
          >
            <span
              className="font-mono text-[8px] uppercase tracking-[0.25em] text-muted opacity-0 transition-all duration-300 group-hover:opacity-100"
            >
              {s.label}
            </span>
            <span
              className="block rounded-full transition-all duration-300"
              style={{
                width:           isActive ? '20px' : '4px',
                height:          '4px',
                background:      isActive ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                boxShadow:       isActive ? '0 0 8px var(--accent)' : 'none',
              }}
            />
          </a>
        );
      })}
    </nav>
  );
}
