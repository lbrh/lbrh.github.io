import { motion } from "motion/react";
import Image from "next/image";
import {useState} from "react";

export default function ComputerHeader() {

  const [count, setCount] = useState(0);

  return (
    <header className="bg-[url('/bg.jpeg')] bg-cover bg-center bg-fixed h-svh py-10 px-5 text-center">
      <div className="grid grid-rows-2 gap-5 h-svh">
        <motion.div className="relative" whileTap={{ scale: 0.95 }} onTap={() => setCount((count) => count + 1)}>
          <Image
            src="/pfp.png"
            alt="Profile Picture"
            height="50"
            width="50"
            className="rounded-full h-full w-auto mx-auto object-cover border-2 border-blue-600 shadow-md"
          />
        </motion.div>
        <div className="h-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-4xl md:text-5xl 2xl:text-6xl font-bold m-0">
              Liam Robinson Hounsell
            </h1>
            {count > 5 ? (
                <p className="text-lg sm:text-2xl lg:text-3xl 2xl:text-4xl mt-2.5">
                  teehee
                </p>
            ) : (
                <p className="text-lg sm:text-2xl lg:text-3xl 2xl:text-4xl mt-2.5">
                  👋 Hi there! I&apos;m Liam, a passionate and driven Software
                  Engineering student from Melbourne, Australia.
                </p>

                )}
          </div>
        </div>
      </div>
    </header>
  );
}
