import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress, scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, 72]
  );

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.85],
    reduceMotion ? [1, 1] : [1, 0.35]
  );

  const bgY = useTransform(
    scrollY,
    [0, 800],
    reduceMotion ? ["0%", "0%"] : ["0%", "18%"]
  );

  return (
    <header
      ref={ref}
      className="relative isolate min-h-svh overflow-hidden text-white"
    >
      {/* BACKGROUNDS */}
      <motion.div
        className="pointer-events-none absolute inset-0 md:hidden bg-[url('/mobile.JPG')] bg-cover bg-center"
        style={{ y: bgY }}
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute inset-0 hidden md:block bg-[url('/bg.jpeg')] bg-cover bg-center"
        style={{ y: bgY }}
        aria-hidden
      />

      {/* MOBILE */}
      <div className="relative z-10 flex min-h-svh flex-col justify-center px-6 py-14 md:hidden">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/15 bg-slate-950/55 p-6 shadow-2xl shadow-cyan-950/50 backdrop-blur-md"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/90">
            Software engineering · Melbourne
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Liam Robinson Hounsell
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-200">
            Full stack engineer building cloud-backed apps with Next.js, Node, and SQL.
            Calm complexity, polish UX, and ship things that scale.
          </p>
        </motion.div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 text-center text-sm text-slate-200/90"
        >
          <span className="rounded-full bg-black/50 px-4 py-2 backdrop-blur-md border border-white/10 shadow-lg">
            ↓ Scroll to explore ↓
          </span>
        </motion.p>
      </div>

      {/* DESKTOP */}
      <motion.div
        className="relative z-10 mx-auto hidden min-h-svh max-w-3xl px-6 py-16 md:flex md:flex-col md:items-center md:justify-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-60 w-60 overflow-hidden rounded-full border-2 border-cyan-400/70 shadow-xl shadow-cyan-500/20"
        >
          <Image
            src="/pfp.jpeg"
            alt="Liam Robinson Hounsell"
            fill
            className="object-cover"
            sizes="240px"
            priority
          />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 w-full rounded-2xl border border-white/15 bg-slate-950/55 p-8 text-center shadow-2xl shadow-cyan-950/50 backdrop-blur-md"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/90">
            Software engineering · Melbourne
          </p>

          <h1 className="text-5xl font-bold tracking-tight">
            Liam Robinson Hounsell
          </h1>

          <p className="mt-4 text-xl leading-relaxed text-slate-200">
            Full stack engineer building cloud-backed apps with Next.js, Node, and SQL.
            Calm complexity, polish UX, and ship things that scale.
          </p>
        </motion.div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 text-center text-sm text-slate-200/90"
        >
          <span className="rounded-full bg-black/50 px-4 py-2 backdrop-blur-md border border-white/10 shadow-lg">
            ↓ Scroll to explore ↓
          </span>
        </motion.p>
      </motion.div>
    </header>
  );
}