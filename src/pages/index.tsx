import Header from "../components/Header";
import Image from "next/image";
import { useEffect, useState } from "react";
import AboutMe from "../components/AboutMe";
import SoftSkills from "../components/SoftSkills";
import HardSkills from "../components/HardSkills";
import CurrentProjects from "../components/CurrentProjects";
import Contact from "../components/Contact";
import Card from "../components/Card";
import Experience from "../components/Experience";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="bg-[#99c7d0]">
      <Header />
      {isMobile ? (
        <div className="grid grid-cols-1 p-5 max-w-7xl mx-auto gap-5">
          <AboutMe />
          <Experience />
          <SoftSkills />
          <HardSkills />
          <CurrentProjects />
          <Contact />
        </div>
      ) : (
        <div className="grid grid-cols-2 p-5 max-w-screen-2xl mx-auto gap-5">
          <AboutMe />
          <Card>
            <Image
              src="1.JPG"
              alt="Temporary Image"
              height="50"
              width="50"
              className="relative h-full w-auto mx-auto object-cover rounded-lg shadow-md"
            />
          </Card>
          <Card>
            <Image
              src="2.png"
              alt="Temporary Image"
              height="50"
              width="50"
              className="relative h-full w-auto mx-auto object-cover rounded-lg shadow-md"
            />
          </Card>
          <Experience />
          <SoftSkills />
          <HardSkills />
          <Card>
            <Image
              src="3.jpg"
              alt="Temporary Image"
              height="50"
              width="50"
              className="h-full w-auto mx-auto object-cover rounded-lg shadow-md"
            />
          </Card>
          <CurrentProjects />
          <Contact />
          <Card>
            <Image
              src="4.JPG"
              alt="Temporary Image"
              height="50"
              width="50"
              className="h-full w-auto mx-auto object-cover rounded-lg shadow-md"
            />
          </Card>
        </div>
      )}

      <footer className="bg-[#516a6f] text-white text-center py-2.5">
        <p>Hope you enjoyed my website!</p>
      </footer>
    </div>
  );
}
