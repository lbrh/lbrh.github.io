import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Syne, Inter } from 'next/font/google';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

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

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
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
  }, []);

  return (
    <div className={`${syne.variable} ${inter.variable}`}>
      <Cursor />
      <Component {...pageProps} />
    </div>
  );
}
