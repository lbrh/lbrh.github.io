const ITEMS = [
  'Next.js', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS',
  'PostgreSQL', 'Firebase', 'Docker', 'Spring Boot', 'Three.js',
  'GSAP', 'Tailwind', 'Supabase', 'Express', 'C++',
];

export default function MarqueeBand() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="border-y border-border overflow-hidden py-4 select-none">
      <div className="marquee-track flex items-center gap-0">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-6 px-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted transition-colors hover:text-accent"
          >
            {item}
            <span className="text-accent/40 text-lg leading-none">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
