import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/data/projects";
import Card from "./Card";
import SectionHeader from "./SectionHeader";

const TILT_DEG = 7;

export default function ProjectsBand() {
  const [selected, setSelected] = useState(0);
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const project = PROJECTS[selected];

  const clamp = useCallback((i: number) => Math.max(0, Math.min(i, PROJECTS.length - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelected((i) => clamp(i + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected((i) => clamp(i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clamp]);

  const handlePanelMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion || !panelRef.current) return;
      const el = panelRef.current;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--tilt-y", `${(px * TILT_DEG).toFixed(2)}deg`);
      el.style.setProperty("--tilt-x", `${(-py * TILT_DEG).toFixed(2)}deg`);
    },
    [reduceMotion],
  );

  const handlePanelLeave = useCallback(() => {
    if (!panelRef.current) return;
    panelRef.current.style.setProperty("--tilt-x", "0deg");
    panelRef.current.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Projects" />

      <p className="-mt-2 mb-2 text-slate-600 md:text-lg">
        Choose a project in the strip, swipe the detail card on touch screens, or use{" "}
        <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
          ←
        </kbd>{" "}
        <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
          →
        </kbd>{" "}
        keys. On desktop, move your pointer over the blue card for a subtle tilt.
      </p>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          aria-label="Choose a project"
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:max-h-[min(70vh,520px)] lg:w-52 lg:flex-shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pr-1"
        >
          {PROJECTS.map((p, i) => {
            const isActive = selected === i;
            return (
              <button
                key={p.title}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={isActive}
                className={`flex shrink-0 flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  isActive
                    ? "border-cyan-600 bg-gradient-to-br from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-900/20"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-400/60 hover:bg-white"
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wide ${isActive ? "text-cyan-100" : "text-slate-500"}`}>
                  {p.dates}
                </span>
                <span className={`mt-1 font-semibold leading-snug ${isActive ? "text-white" : "text-slate-900"}`}>
                  {p.title}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <div
            ref={panelRef}
            onMouseMove={handlePanelMove}
            onMouseLeave={handlePanelLeave}
            className="relative [--tilt-x:0deg] [--tilt-y:0deg]"
            style={{ perspective: reduceMotion ? undefined : 1200 }}
          >
            <div
              className="will-change-transform [transform-style:preserve-3d]"
              style={{
                transform: reduceMotion ? undefined : "rotateX(var(--tilt-x)) rotateY(var(--tilt-y))",
                transition: reduceMotion ? undefined : "transform 90ms ease-out",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.article
                  key={project.title}
                  role="article"
                  aria-live="polite"
                  aria-atomic="true"
                  drag={reduceMotion ? false : "x"}
                  dragDirectionLock
                  dragConstraints={{ left: -48, right: 48 }}
                  dragElastic={0.12}
                  onDragEnd={(_, info) => {
                    const dx = info.offset.x;
                    if (dx < -48) setSelected((i) => clamp(i + 1));
                    if (dx > 48) setSelected((i) => clamp(i - 1));
                  }}
                  initial={reduceMotion ? false : { opacity: 0, y: 20, rotateX: 2 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -16, rotateX: -2 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="cursor-grab rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-white via-slate-50 to-cyan-50/80 p-6 shadow-xl shadow-cyan-900/10 active:cursor-grabbing md:p-8"
                >
                  <p className="text-xs uppercase tracking-wider text-cyan-700">{project.dates}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{project.title}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-600 md:text-base">{project.org}</p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-slate-800 md:text-base">
                    {project.bullets.map((b, bulletIdx) => (
                      <li key={`${project.title}-${bulletIdx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" aria-hidden />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {project.links && project.links.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-cyan-900/10 pt-5">
                      {project.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-700/30 bg-white px-4 py-2 text-sm font-semibold text-cyan-900 shadow-sm transition hover:border-cyan-600 hover:bg-cyan-50"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          {l.label}
                          <span aria-hidden className="text-base leading-none">
                            ↗
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </motion.article>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => setSelected((i) => clamp(i - 1))}
              disabled={selected === 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-800 transition hover:border-cyan-500/50 hover:text-cyan-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              {selected + 1} / {PROJECTS.length}
            </span>
            <button
              type="button"
              onClick={() => setSelected((i) => clamp(i + 1))}
              disabled={selected === PROJECTS.length - 1}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-800 transition hover:border-cyan-500/50 hover:text-cyan-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
