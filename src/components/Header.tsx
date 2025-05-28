import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-[url('/bg.jpeg')] bg-cover bg-center bg-fixed h-svh py-10 px-5 text-center">
      <div className="grid grid-rows-2 gap-5 h-svh">
        <div className="relative">
          <Image
            src="/pfp.jpeg"
            alt="Profile Picture"
            height="50"
            width="50"
            className="rounded-full h-full w-auto mx-auto object-cover border-2 border-blue-600 shadow-md"
          />
        </div>
        <div className="h-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-7xl mx-auto">
            <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-7xl font-bold m-0">
              Liam Robinson Hounsell
            </h1>
            <p className="text-xl mt-2.5">
              👋 Hi there! I&apos;m Liam, a passionate and driven Software
              Engineering student from Melbourne, Australia.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
