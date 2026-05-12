import Head from "next/head";
import Hero from "../components/Hero";
import SkillRail from "../components/SkillRail";
import AboutMe from "../components/AboutMe";
import Education from "../components/Education";
import SoftSkills from "../components/SoftSkills";
import HardSkills from "../components/HardSkills";
import ProjectsBand from "../components/ProjectsBand";
import Experience from "../components/Experience";
import PhotoStrip from "../components/PhotoStrip";
import Contact from "../components/Contact";
import { Reveal } from "../components/motion/Reveal";

export default function Home() {
  return (
    <>
      <Head>
        <title>Liam Robinson Hounsell | Software Engineer</title>
        <meta
          name="description"
          content="Portfolio of Liam Robinson Hounsell: full stack software engineer in Melbourne building Next.js apps, cloud backends, and data-driven experiences."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-cyan-950/60 to-[#79b8c9] pb-24 text-slate-900">
        <Hero />
        <SkillRail />

        <main className="mx-auto mt-14 max-w-5xl space-y-14 px-4 sm:mt-16 sm:px-6 md:mt-24 md:space-y-20 lg:max-w-6xl lg:px-8">
          <Reveal direction="right" delay={0.02}>
            <AboutMe />
          </Reveal>
          <Reveal direction="left" delay={0.04}>
            <Education />
          </Reveal>
          <Reveal direction="up">
            <HardSkills />
          </Reveal>
          <Reveal direction="left">
            <Experience />
          </Reveal>
          <Reveal direction="right">
            <ProjectsBand />
          </Reveal>
          <Reveal direction="up">
            <SoftSkills />
          </Reveal>
          <Reveal direction="left">
            <Contact />
          </Reveal>
          <Reveal direction="up">
            <PhotoStrip />
          </Reveal>
        </main>

        <footer className="mx-auto mt-16 max-w-5xl px-6 text-center text-sm text-slate-950/85">
          Built with Next.js export and Framer Motion, ready for GitHub Pages.
        </footer>
      </div>
    </>
  );
}
