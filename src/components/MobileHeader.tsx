
export default function MobileHeader() {
  return (
      <header className="bg-[url('/mobile.JPG')] bg-cover bg-center h-svh py-10 px-5 text-center">
          <div className="grid grid-rows-2 h-svh justify-end contain-content">
              <div></div>
          <div className="flex justify-between pb-10 items-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-7xl mx-auto">
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-7xl font-bold m-0">
                Liam Robinson Hounsell
              </h1>
              <p className="text-lg sm:text-2xl lg:text-3xl 2xl:text-4xl mt-2.5">
                👋 Hi there! I&apos;m Liam, a passionate and driven Software
                Engineering student from Melbourne, Australia.
              </p>
            </div>
          </div>
          </div>
      </header>
  );
}
