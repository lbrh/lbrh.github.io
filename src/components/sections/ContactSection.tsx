import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const EMAIL = 'lbrhounsell@gmail.com';

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const emailRef   = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from('.contact-item', {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 70%' },
      });
    }, el);

    /* Magnetic email button */
    const btn = emailRef.current;
    if (!btn) return () => ctx.revert();

    const onMove = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * 0.28;
      const y = (e.clientY - r.top  - r.height / 2) * 0.28;
      gsap.to(btn, { x, y, duration: 0.35, ease: 'power2.out' });
    };
    const onLeave = () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.4)' });
    };

    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);

    return () => {
      ctx.revert();
      btn.removeEventListener('mousemove', onMove);
      btn.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* fallback — do nothing */
    }
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden py-32"
    >
      {/* Ghost background text */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <span
          className="font-display font-black uppercase select-none whitespace-nowrap"
          style={{
            fontSize: 'clamp(6rem, 22vw, 22rem)',
            color: 'rgba(255,255,255,0.018)',
            letterSpacing: '-0.03em',
          }}
        >
          Hello
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl px-6 text-center">
        <p className="contact-item font-mono text-[10px] uppercase tracking-[0.35em] text-accent mb-6">
          05 — Contact
        </p>

        <h2
          className="contact-item font-display font-black leading-[0.9] tracking-[-0.02em] text-fg"
          style={{ fontSize: 'clamp(2.8rem,8vw,7rem)' }}
        >
          Got a project<br />
          <span className="text-accent">in mind?</span>
        </h2>

        <p className="contact-item mt-6 max-w-lg mx-auto text-base text-muted leading-relaxed">
          I'm open to freelance, full-time, and collaborative opportunities.
          Whether it's a product, a side project, or just a conversation. Let's talk.
        </p>

        {/* Email */}
        <div className="contact-item mt-14 inline-block">
          <a
            ref={emailRef}
            href={`mailto:${EMAIL}`}
            className="group relative inline-block font-display font-black text-fg transition-colors duration-300 hover:text-accent"
            style={{ fontSize: 'clamp(1.1rem,3.5vw,2.6rem)' }}
            aria-label="Send email"
          >
            {EMAIL}
            <span
              className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full"
            />
          </a>

          <button
            onClick={copyEmail}
            className="ml-4 inline-flex items-center gap-1.5 align-middle border border-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted transition hover:border-accent/40 hover:text-accent"
            aria-label="Copy email address"
          >
            {copied ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="3" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 3V2a.5.5 0 01.5-.5h4A.5.5 0 018 2v4a.5.5 0 01-.5.5H7" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Social links */}
        <div className="contact-item mt-14 flex flex-wrap items-center justify-center gap-8">
          {[
            { label: 'GitHub',   href: 'https://github.com/lbrh' },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/in/lbrh' },
            { label: 'Resume',   href: '/Liam_Robinson_Hounsell_Resume.pdf' },
            { label: 'RMIT Sailing', href: 'https://www.rmitsailing.club/' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted transition-colors hover:text-fg"
            >
              {l.label}
              <svg
                width="8" height="8" viewBox="0 0 8 8" fill="none"
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <path d="M1 7L7 1M7 1H3M7 1V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
