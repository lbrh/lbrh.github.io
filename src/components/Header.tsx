import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-blue-600 text-red-50 py-10 px-5 text-center">
      <div className="w-48 h-48 mx-auto text-red-50 mb-4 relative">
        <Image 
          src="pfp.jpeg"
          alt="Profile Picture" 
          width={200}
          height={200}
          className="rounded-full object-cover border-2 border-blue-600 shadow-md hover:scale-110 transition-transform duration-300"
        />
      </div>
      <h1 className="text-4xl font-bold m-0">Liam Robinson Hounsell</h1>
      <p className="text-red-50 text-xl mt-2.5">👋 Hi there! I&apos;m Liam, a passionate and driven Software Engineering student from Melbourne, Australia.</p>
    </header>
  );
} 