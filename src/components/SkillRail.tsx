import { motion, useReducedMotion } from "framer-motion";

const SKILLS = [
  "TypeScript",
  "JavaScript",
  "Java",
  "C++",
  "Next.js",
  "React",
  "Node.js",
  "Express",
  "Spring Boot",
  "AWS",
  "Firebase",
  "Vercel",
  "Supabase",
  "Docker",
  "GitHub Actions",
  "Git",
  "WordPress",
  "MySQL",
  "PostgreSQL",
  "SQLite",
] as const;

export default function SkillRail() {
  const reduceMotion = useReducedMotion();
  const doubled = [...SKILLS, ...SKILLS];

  return (
    <section
      aria-label="Technical skills"
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden border-y border-white/10 bg-slate-900/85 py-5 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 to-transparent" />

      {reduceMotion ? (
        <div className="flex flex-wrap justify-center gap-3 px-6">
          {SKILLS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-cyan-500/30 bg-slate-800/80 px-4 py-1.5 text-sm text-slate-200"
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <motion.div
          className="flex w-max gap-3 px-3"
          animate={{ x: [0, -1600] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 48,
              ease: "linear",
            },
          }}
        >
          {doubled.map((skill, i) => (
            <span
              key={`${skill}-${i}`}
              className="shrink-0 rounded-full border border-cyan-500/35 bg-slate-800/90 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm shadow-cyan-950/30"
            >
              {skill}
            </span>
          ))}
        </motion.div>
      )}

      <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
        Horizontal strip: marquee of the stack from my resume
      </p>
    </section>
  );
}
