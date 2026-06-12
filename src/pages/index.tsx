import { useCallback, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Nav               from '@/components/Nav';
import Footer            from '@/components/Footer';
import SectionDots       from '@/components/SectionDots';
import HeroSection       from '@/components/sections/HeroSection';
import MarqueeBand       from '@/components/sections/MarqueeBand';
import AboutSection      from '@/components/sections/AboutSection';
import ProjectsSection   from '@/components/sections/ProjectsSection';
import ExperienceSection from '@/components/sections/ExperienceSection';
import PhotoSection      from '@/components/sections/PhotoSection';
import ContactSection    from '@/components/sections/ContactSection';

/* Preloader is client-only — avoids SSR flash */
const Preloader = dynamic(() => import('@/components/Preloader'), { ssr: false });

export default function Home() {
  const [preloadDone, setPreloadDone] = useState(false);

  const handlePreloadDone = useCallback(() => setPreloadDone(true), []);

  return (
    <>
      <Head>
        <title>Liam Brian Robinson Hounsell · Software Engineer</title>
        <meta
          name="description"
          content="Portfolio of Liam Brian Robinson Hounsell — full-stack software engineer in Melbourne building Next.js apps, cloud backends, and data-driven experiences."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#070707" />
        <link rel="icon" href="/favicon.ico" />
        {/* Open Graph */}
        <meta property="og:title"       content="Liam Brian Robinson Hounsell · Software Engineer" />
        <meta property="og:description" content="Full-stack engineer in Melbourne — Next.js, cloud, Three.js." />
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content="https://lbrh.space" />
      </Head>

      {/* Preloader overlay */}
      {!preloadDone && <Preloader onDone={handlePreloadDone} />}

      {/* Main content fades in after preloader */}
      <div
        style={{
          opacity: preloadDone ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: preloadDone ? 'auto' : 'none',
        }}
      >
        <Nav />
        <SectionDots />

        <main>
          <HeroSection />
          <MarqueeBand />
          <AboutSection />
          <ProjectsSection />
          <ExperienceSection />
<PhotoSection />
          <ContactSection />
        </main>

        <Footer />
      </div>
    </>
  );
}
