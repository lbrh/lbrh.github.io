import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 72]);
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.85],
    reduceMotion ? [1, 1] : [1, 0.35],
  );
  return (
    <header ref={ref} className="relative isolate min-h-svh overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0 md:hidden bg-[url('/mobile.JPG')] bg-cover bg-center"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block bg-[url('/bg.jpeg')] bg-cover bg-center bg-fixed"
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto grid min-h-svh max-w-7xl grid-rows-[auto_1fr_auto] px-6 py-14 md:grid-rows-[1fr_auto] md:py-16"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <div className="hidden justify-center md:flex">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/70 shadow-xl shadow-cyan-500/20 sm:h-52 sm:w-52 md:h-60 md:w-60"
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
        </div>

        <div className="flex flex-col justify-end md:justify-center md:pb-14">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-white/15 bg-slate-950/55 p-6 shadow-2xl shadow-cyan-950/50 backdrop-blur-md sm:p-8"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/90">
              Software engineering · Melbourne
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Liam Robinson Hounsell
            </h1>
            <p className="mt-4 max-w-3xl text-balance text-base leading-relaxed text-slate-200 sm:text-lg md:text-xl">
              Full stack engineer building cloud-backed apps with Next.js, Node, and SQL.
              Calm complexity, polish UX, and ship things that scale.
            </p>
          </motion.div>
        </div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 text-center text-sm text-slate-400 md:mt-0"
          aria-hidden
        >
          Scroll to explore →
        </motion.p>
      </motion.div>
    </header>
  );
}
