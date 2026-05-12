import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

type GalleryPhoto =
  | { src: string; alt: string }
  | { src: string; alt: string; caption: string; captionSub?: string };

const PHOTOS: GalleryPhoto[] = [
  { src: "/1.JPG", alt: "Gallery photo 1" },
  { src: "/2.png", alt: "Gallery photo 2" },
  {
    src: "/3.jpeg",
    alt: "Group on stage at HEXPO behind a glowing HEXPO sign, celebrating with flowers",
    caption: "HEXPO",
    captionSub: "Team showcase on stage",
  },
  {
    src: "/award.jpeg",
    alt: "Holding the RMIT University Nationals Team Spirit wooden shield award in a tartan suit",
    caption: "Team Spirit",
    captionSub: "RMIT University Nationals",
  },
  { src: "/4.JPG", alt: "Gallery photo 4" },
];

export default function PhotoStrip() {
  const reduceMotion = useReducedMotion();
  const measureRef = useRef<HTMLDivElement>(null);
  const [loopWidth, setLoopWidth] = useState(0);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    function measure() {
      const node = measureRef.current;
      if (!node) return;
      setLoopWidth(node.getBoundingClientRect().width);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const photoFrameClass =
    "group relative h-[220px] w-[280px] shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40 sm:h-[280px] sm:w-[340px]";

  function renderPhotoFrame(
    photo: GalleryPhoto,
    keyPrefix: string,
    withAlt: boolean,
  ) {
    const hasCaption = "caption" in photo && photo.caption;
    return (
      <div key={`${keyPrefix}-${photo.src}`} className={photoFrameClass}>
        <Image
          src={photo.src}
          alt={withAlt ? photo.alt : ""}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="340px"
          aria-hidden={!withAlt}
        />
        {hasCaption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 opacity-90 transition duration-300 group-hover:opacity-100">
            <p className="text-sm font-semibold text-white">{photo.caption}</p>
            {"captionSub" in photo && photo.captionSub && (
              <p className="text-xs text-white/85">{photo.captionSub}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="Photo gallery"
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen space-y-4 overflow-hidden py-1"
    >
      <h2 className="px-6 text-center text-xl font-semibold text-slate-100 md:text-2xl">
        Auto-scrolling snapshots
      </h2>
      <p className="px-6 text-center text-sm text-slate-200/90">
        Hover stills for HEXPO and RMIT Nationals captions.
      </p>

      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 flex w-max gap-4 opacity-0"
        tabIndex={-1}
      >
        {PHOTOS.map((photo) => renderPhotoFrame(photo, "measure", false))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#79b8c9] from-30% to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#79b8c9] from-30% to-transparent sm:w-16" />

      {reduceMotion ? (
        <div className="flex flex-wrap justify-center gap-4 px-6 pb-4">
          {PHOTOS.map((photo) => renderPhotoFrame(photo, "static", true))}
        </div>
      ) : loopWidth > 0 ? (
        <motion.div
          className="relative z-[1] flex w-max gap-4 pb-4 pl-6"
          animate={{ x: [0, -loopWidth] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: Math.max(loopWidth / 45, 18),
              ease: "linear",
            },
          }}
        >
          <div className="flex shrink-0 gap-4">
            {PHOTOS.map((photo) => renderPhotoFrame(photo, "a", true))}
          </div>
          <div className="flex shrink-0 gap-4">
            {PHOTOS.map((photo) => renderPhotoFrame(photo, "b", false))}
          </div>
        </motion.div>
      ) : (
        <div className="min-h-[220px] sm:min-h-[280px]" aria-hidden />
      )}
    </section>
  );
}
