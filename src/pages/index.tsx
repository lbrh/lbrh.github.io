export default function Home() {
  return (
    <div className="font-sans text-gray-800 bg-gray-50">
      <header className="bg-blue-600 text-white py-10 px-5 text-center">
        <div className="w-48 h-48 mx-auto mb-4">
          <img 
            src="pfp.jpeg" 
            alt="Profile Picture" 
            className="w-full h-full rounded-full object-cover border-2 border-blue-600 shadow-md hover:scale-110 transition-transform duration-300"
          />
        </div>
        <h1 className="text-4xl font-bold m-0">Liam Robinson Hounsell</h1>
        <p className="text-xl mt-2.5">👋 Hi there! I'm Liam, a passionate and driven Software Engineering student from Melbourne, Australia.</p>
      </header>
      <main className="p-5 max-w-7xl mx-auto">
        <section className="mb-10">
          <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">About Me</h2>
          <p>
            I'm currently pursuing a Bachelor of Software Engineering at the Royal Melbourne Institute of Technology (RMIT), expected to graduate in July 2027. I thrive on learning new technologies, tackling complex challenges, and creating impactful projects. I actively participate in hackathons, conferences, and webinars and founded the RMIT Sailing Club to blend my love for sailing with leadership and community building.
          </p>
        </section>
        
        <section className="mb-10">
          <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">Experience</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <h3 className="text-xl text-blue-600 mt-0">Amazon Prime Air | Internship | 2023</h3>
            <p>
              - Collaborated on advanced robotics and IoT systems.<br />
              - Enhanced automation processes.<br />
              - Gained invaluable industry insights by shadowing professionals.<br />
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <h3 className="text-xl text-blue-600 mt-0">Telltale Solutions | Founder | 2024-Present</h3>
            <p>
              - Spearheaded technology-driven projects, including <strong>PortStart.ai</strong>, an AI umpire system for competitive sailing.<br />
              - Managed project lifecycles and delivered innovative solutions.<br />
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <h3 className="text-xl text-blue-600 mt-0">Community Sailing School | Website Developer | 2023-Present</h3>
            <p>
              - Designed and maintained a WordPress site for 350+ users.<br />
              - Conducted user-centric design thinking sessions.<br />
              <a href="https://www.communitysailingschool.org" className="text-blue-600 hover:underline">Visit the site</a>.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <h3 className="text-xl text-blue-600 mt-0">VidLabs | Community Manager & Founder Shadow | 2024</h3>
            <p>
              - Managed a vibrant Discord community to boost engagement.<br />
              - Promoted AI-powered platforms such as AlphaTwin and VidLabs.<br />
              - Shadowed founders during coding sessions for deeper product insights.<br />
            </p>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">Skills</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
            <div className="text-center">
              <img src="htmlcss.png" alt="HTML/CSS" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">HTML/CSS</span>
            </div>
            <div className="text-center">
              <img src="java.png" alt="Java" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">Java</span>
            </div>
            <div className="text-center">
              <img src="cpp.png" alt="C++" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">C++</span>
            </div>
            <div className="text-center">
              <img src="js.png" alt="JavaScript" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">JavaScript</span>
            </div>
            <div className="text-center">
              <img src="python.png" alt="Python" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">Python</span>
            </div>
            <div className="text-center">
              <img src="node.png" alt="Node.js" className="w-16 h-16 mx-auto mb-2.5" />
              <span className="block text-base">Node.js</span>
            </div>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">What I'm Working On</h2>
          <ul className="list-disc pl-5">
            <li><strong>PortStart.ai:</strong> Developing an AI-powered umpire system for sailing.</li>
            <li><strong>RMIT Sailing Club:</strong> Integrating technology to enhance member engagement.</li>
            <li><strong>Open Source:</strong> Exploring web development and IoT projects.</li>
            <li><strong>Coming soon 👀</strong></li>
          </ul>
        </section>
        
        <section className="mb-10">
          <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">Contact</h2>
          <ul className="list-disc pl-5">
            <li><strong>GitHub:</strong> <a href="https://github.com/your-github" className="text-blue-600 hover:underline">LiamHounsell</a></li>
            <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/liam-hounsell" className="text-blue-600 hover:underline">Liam Hounsell</a></li>
            <li><strong>Email:</strong> <a href="mailto:lbrhounsell@gmail.com" className="text-blue-600 hover:underline">lbrhounsell@gmail.com</a></li>
          </ul>
          <p>Let's connect, collaborate, or chat about technology, sailing, or anything in between!</p>
        </section>
      </main>
      <footer className="bg-gray-800 text-white text-center py-2.5">
        <p>Hope you enjoyed my website!</p>
      </footer>
    </div>
  );
}
