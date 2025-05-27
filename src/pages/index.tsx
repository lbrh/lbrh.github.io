import ExperienceCard from '../components/ExperienceCard';
import SkillIcon from '../components/SkillIcon';
import SectionHeader from '../components/SectionHeader';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="font-sans text-gray-800">
      <Header />
      <main className="p-5 max-w-7xl mx-auto">
        <section className="mb-10">
          <SectionHeader title="About Me" />
          <p>
            I&apos;m currently pursuing a Bachelor of Software Engineering at the Royal Melbourne Institute of Technology (RMIT), expected to graduate in July 2027. I thrive on learning new technologies, tackling complex challenges, and creating impactful projects. I actively participate in hackathons, conferences, and webinars and founded the RMIT Sailing Club to blend my love for sailing with leadership and community building.
          </p>
        </section>
        
        <section className="mb-10">
          <SectionHeader title="Experience" />
          <ExperienceCard 
            title="Amazon Prime Air"
            period="Internship | 2023"
            description="- Collaborated on advanced robotics and IoT systems.<br />- Enhanced automation processes.<br />- Gained invaluable industry insights by shadowing professionals."
          />
          <ExperienceCard 
            title="Telltale Solutions"
            period="Founder | 2024-Present"
            description="- Spearheaded technology-driven projects, including <strong>PortStart.ai</strong>, an AI umpire system for competitive sailing.<br />- Managed project lifecycles and delivered innovative solutions."
          />
          <ExperienceCard 
            title="Community Sailing School"
            period="Website Developer | 2022-2023"
            description="- Designed and maintained a WordPress site for 350+ users.<br />- Conducted user-centric design thinking sessions.<br /><a href='https://www.communitysailingschool.org' className='text-blue-600 hover:underline'>Visit the site</a>."
          />
          <ExperienceCard 
            title="VidLabs"
            period="Community Manager & Founder Shadow | 2024-present"
            description="- Managed a vibrant Discord community to boost engagement.<br />- Promoted AI-powered platforms such as AlphaTwin and VidLabs.<br />- Shadowed founders during coding sessions for deeper product insights."
          />
        </section>
        
        <section className="mb-10">
          <SectionHeader title="Skills" />
          <div className="flex flex-wrap justify-center gap-5">
            <SkillIcon src="lbrh.github.io/htmlcss.png" alt="HTML/CSS" name="HTML/CSS" />
            <SkillIcon src="lbrh.github.io/java.png" alt="Java" name="Java" />
            <SkillIcon src="lbrh.github.io/cpp.png" alt="C++" name="C++" />
            <SkillIcon src="lbrh.github.io/js.png" alt="JavaScript" name="JavaScript" />
            <SkillIcon src="lbrh.github.io/python.png" alt="Python" name="Python" />
            <SkillIcon src="lbrh.github.io/node.png" alt="Node.js" name="Node.js" />
          </div>
        </section>
        <section className="mb-10">
          <SectionHeader title="What I&apos;m Working On" />
          <ul className="list-disc pl-5">
            <li><strong>PortStart.ai:</strong> Developing an AI-powered umpire system for sailing.</li>
            <li><strong>RMIT Sailing Club:</strong> Integrating technology to enhance member engagement.</li>
            <li><strong>Open Source:</strong> Exploring web development and IoT projects.</li>
            <li><strong>Coming soon 👀</strong></li>
          </ul>
        </section>
        
        <section className="mb-10">
          <SectionHeader title="Contact" />
          <ul className="list-disc pl-5">
            <li><strong>GitHub:</strong> <a href="https://github.com/your-github" className="text-blue-600 hover:underline">LiamHounsell</a></li>
            <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/liam-hounsell" className="text-blue-600 hover:underline">Liam Hounsell</a></li>
            <li><strong>Email:</strong> <a href="mailto:lbrhounsell@gmail.com" className="text-blue-600 hover:underline">lbrhounsell@gmail.com</a></li>
          </ul>
          <p>Let&apos;s connect, collaborate, or chat about technology, sailing, or anything in between!</p>
        </section>
      </main>
      <footer className="bg-gray-800 text-white text-center py-2.5">
        <p>Hope you enjoyed my website!</p>
      </footer>
    </div>
  );
}
