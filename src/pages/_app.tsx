import '@/styles/globals.css';
import '@/styles/toolbox.css';
import type { AppProps } from 'next/app';
import { Syne, Inter, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const Cursor = dynamic(() => import('@/components/Cursor'), { ssr: false });

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

/* Toolbox-only fonts — a neutral, corporate pairing kept separate from the
   portfolio's display type so the tools read as plain working documents. */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tb-font-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tb-font-mono',
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isToolbox = router.pathname.startsWith('/toolbox');

  useEffect(() => {
    // Toolbox pages are app-like (canvases, panels) — smooth scroll hijacking
    // the wheel there fights the tools rather than helping.
    if (isToolbox) return;
    let cleanup: (() => void) | undefined;

    const initScroll = async () => {
      const { default: Lenis } = await import('lenis');
      const gsap               = (await import('gsap')).gsap;
      const { ScrollTrigger }  = await import('gsap/ScrollTrigger');

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });

      const scrollHandler = () => ScrollTrigger.update();
      lenis.on('scroll', scrollHandler);

      const ticker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        lenis.off('scroll', scrollHandler);
        gsap.ticker.remove(ticker);
        lenis.destroy();
      };
    };

    initScroll();
    return () => cleanup?.();
  }, [isToolbox]);

  return (
    <div className={`${syne.variable} ${inter.variable} ${plexSans.variable} ${plexMono.variable}`}>
      {!isToolbox && <Cursor />}
      <Component {...pageProps} />
    </div>
  );
}
