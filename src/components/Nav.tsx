import { useEffect, useState } from 'react';

const LINKS = [
  { label: 'About',      href: '#about' },
  { label: 'Work',       href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact',    href: '#contact' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled ? 'bg-bg/85 backdrop-blur-xl border-b border-border' : '',
      ].join(' ')}
    >
      <div className="mx-auto flex items-center justify-between px-8 py-5 max-w-7xl">
        {/* Logo */}
        <a
          href="#"
          className="font-display text-xs font-bold tracking-[0.3em] uppercase text-accent"
        >
          LBRH
        </a>

        {/* Links */}
        <ul className="hidden md:flex items-center gap-10">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative text-xs tracking-[0.18em] uppercase text-muted transition-colors duration-200 hover:text-fg group"
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        {/* Resume */}
        <a
          href="/Liam_Robinson_Hounsell_Resume.pdf"
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] border border-accent/30 text-accent px-4 py-2.5 transition hover:bg-accent hover:text-black"
        >
          Resume
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70">
            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </nav>
  );
}
