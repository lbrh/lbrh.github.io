import { useEffect, useState } from 'react';

const LINKS = [
  { label: 'About',      href: '#about' },
  { label: 'Work',       href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact',    href: '#contact' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Lock background scroll while the mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled || open ? 'bg-bg/85 backdrop-blur-xl border-b border-border' : '',
      ].join(' ')}
    >
      <div className="mx-auto flex items-center justify-between px-6 py-5 max-w-7xl md:px-8">
        {/* Logo */}
        <a
          href="#"
          onClick={() => setOpen(false)}
          className="relative z-50 font-display text-xs font-bold tracking-[0.3em] uppercase text-accent"
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

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="relative z-50 -mr-2 flex h-10 w-10 items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className="absolute left-0 block h-0.5 w-6 transition-all duration-300"
              style={{
                background: 'var(--fg)',
                top: open ? '50%' : '0',
                transform: open ? 'translateY(-50%) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="absolute left-0 top-1/2 block h-0.5 w-6 -translate-y-1/2 transition-all duration-300"
              style={{ background: 'var(--fg)', opacity: open ? 0 : 1 }}
            />
            <span
              className="absolute left-0 block h-0.5 w-6 transition-all duration-300"
              style={{
                background: 'var(--fg)',
                bottom: open ? '50%' : '0',
                transform: open ? 'translateY(50%) rotate(-45deg)' : 'none',
              }}
            />
          </span>
        </button>
      </div>
      </nav>

      {/* Mobile full-screen menu — sibling of <nav> so its fixed positioning
          is relative to the viewport, not the backdrop-filtered nav bar. */}
      <div
        className={[
          'fixed inset-0 z-40 flex flex-col bg-bg transition-all duration-400 md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      >
        <div className="flex flex-col px-6 pt-28">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-4 border-b border-border py-4 font-display text-4xl font-black uppercase tracking-tight text-fg transition-colors hover:text-accent"
            >
              <span className="font-mono text-xs font-normal text-accent">
                0{i + 1}
              </span>
              {l.label}
            </a>
          ))}

          <a
            href="/Liam_Robinson_Hounsell_Resume.pdf"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="mt-10 inline-flex w-max items-center gap-2 border border-accent/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent transition hover:bg-accent hover:text-black"
          >
            Resume
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70">
              <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
