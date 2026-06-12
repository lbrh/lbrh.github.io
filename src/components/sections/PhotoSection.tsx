import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/*
 * Three columns — photos stack naturally so their varying heights
 * create a puzzle / collage fit with minimal gaps.
 */
const COLUMNS: { src: string; alt: string; aspect: string; position: string }[][] = [
  // Column 1
  [
    { src: '/IMG_2765.JPG', alt: 'Spinnaker run',   aspect: 'aspect-[3/4]', position: 'object-center' },
    { src: '/4.JPG',        alt: 'Race day',        aspect: 'aspect-[4/3]', position: 'object-center' },
    { src: '/1.JPG',        alt: 'Pitch day',       aspect: 'aspect-[4/3]', position: 'object-center' },
  ],
  // Column 2
  [
    { src: '/IMG_2260.JPG', alt: 'Regatta crew',    aspect: 'aspect-[4/3]', position: 'object-top' },
    { src: '/3.jpeg',       alt: 'HEXPO',           aspect: 'aspect-[4/3]', position: 'object-center' },
    { src: '/IMG_3369.jpeg',alt: 'Networking chat',  aspect: 'aspect-[4/3]', position: 'object-center' },
  ],
  // Column 3
  [
    { src: '/award.jpeg',   alt: 'Award ceremony',  aspect: 'aspect-[3/4]', position: 'object-top' },
    { src: '/hex-team.jpg', alt: 'HEX ambassadors', aspect: 'aspect-[3/4]', position: 'object-right-top' },
  ],
];

export default function PhotoSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.photo-label', {
        opacity: 0, y: 20, duration: 0.7,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 82%' },
      });

      gsap.from('.photo-frame', {
        opacity: 0,
        y: 40,
        scale: 0.98,
        duration: 0.9,
        stagger: { each: 0.08, from: 'start' },
        ease: 'power3.out',
        scrollTrigger: { trigger: '.photo-strip', start: 'top 80%' },
      });
    }, sectionRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-7xl px-6 py-20 md:px-12"
    >
      <div className="photo-label flex items-baseline justify-between mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-accent">
          Life outside the terminal
        </p>
        <p className="hidden md:block text-xs text-muted">Sailing · HEX · Regattas</p>
      </div>

      {/* Masonry-style 3-column flex layout */}
      <div className="photo-strip flex gap-1">
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-1">
            {col.map((photo, pi) => (
              <div
                key={pi}
                className={`photo-frame relative overflow-hidden border border-black group w-full ${photo.aspect}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className={`object-cover grayscale-[15%] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 ${photo.position}`}
                  sizes="(max-width: 768px) 50vw, 33vw"
                />

                {/* Hover overlay + label */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute bottom-3 left-3 translate-y-1 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-fg/90">
                    {photo.alt}
                  </span>
                </div>

                {/* Accent line on hover */}
                <div
                  className="absolute top-0 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full"
                  style={{ boxShadow: '0 0 10px 1px var(--accent)' }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
