import ExperienceCard from '../components/ExperienceCard';
import SkillIcon from '../components/SkillIcon';
import SectionHeader from '../components/SectionHeader';
import Header from '../components/Header';
import Image from "next/image";

export default function Home() {
    return (
        <div className="bg-[#99c7d0]">
            <Header/>
            <div className="grid grid-cols-2 p-5 max-w-7xl mx-auto gap-5">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="About Me"/>
                        <p className="sm:text-sm md:text-lg">
                            I&apos;m currently pursuing a Bachelor of Software Engineering at the Royal Melbourne
                            Institute of
                            Technology (RMIT), expected to graduate in July 2027. From growing up across the USA, China,
                            and Australia,
                            I&apos;ve always had an appreciation of different cultures and perspectives. I thrive on
                            learning cutting edge technologies, tackling
                            complex challenges, and creating impactful projects. I also actively participate in
                            hackathons, conferences,
                            and webinars due to a love to keep up with new and emerging projects/ideas. Outside of
                            everything digital, I enjoy
                            sailing, bouldering, and reading. I&apos;ve gone as far as to start and run the RMIT Sailing
                            Club which
                            currently has around 50 active members.
                        </p>
                    </section>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <Image src="1.JPG" alt="Temporary Image" height="50" width="50"
                           className="relative h-full w-auto mx-auto object-cover rounded-lg shadow-md"></Image>
                </div>
                <div className="row-span-2 bg-white rounded-lg shadow-md p-6">
                    <Image src="2.png" alt="Temporary Image" height="50" width="50"
                           className="relative h-full w-auto mx-auto object-cover rounded-lg shadow-md"></Image>
                </div>
                <div className="row-span-2 bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="Past Experiences"/>
                        <ExperienceCard
                            title="Consulate General of Canada "
                            period="Data Analyst and Back End Developer | 2023-2024"
                            description="- Created and updated 1000+ pages for the Canadian Flavors website <br />
                            - Populated said pages with data pulled from multiple sources including company databases and spreadsheets<br />
                            - <a href='https://www.canadianflavors.com/' className='hover:underline text-blue-500'>Visit the site</a>."
                        />
                        <ExperienceCard
                            title="Amazon Prime Air"
                            period="Internship | 2023"
                            description="
                            - Gained insight into software development for drone operations, including backend systems and flight algorithm testing processes in real-world environments <br />
                            - Learned how teams analyze customer needs and preferences to shape drone delivery solutions, emphasizing user-centric design and convenience <br />
                            - Explored both software and physical development cycles through rotations across diverse teams"
                        />

                        <ExperienceCard
                            title="Community Sailing School"
                            period="Website Developer | 2022-2023"
                            description="- Designed and maintained a WordPress site for 350+ sailors, coaches, and supporters.<br />
                            - Website design brief created by utilizing design thinking to ensure work was appropriately scoped and customer needs were well understood.<br />
                            - <a href='https://www.communitysailingschool.org' className='hover:underline text-blue-500'>Visit the site</a>."
                        />
                        <ExperienceCard
                            title="VangBot"
                            period="Node.js Developer | 2019-2023"
                            description="- Developed a Discord bot using Node.js and Discord.js, hosted on a Raspberry Pi for 24/7 uptime <br />
                            - Integrated a SQL database for persistent user data and server configurations <br />
                            - Served over 10,000 users across multiple Discord servers with advanced moderation and utility features"
                        />
                    </section>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="Soft Skills"/>
                        <ul className="list-disc pl-5 text-lg">
                            <li><strong>Leadership:</strong> Gained through years of experience of starting/leading
                                teams of all sizes, from my highschool&apos;s esports or robotics team with a handful of
                                people, all the way up to the entire year levels through class board
                            </li>
                            <br/>
                            <li><strong>Team Work and Collaboration:</strong> Also gained through collaborative
                                clubs/sports such as sailing, snowboarding, and GYLI (global youth leadership
                                initiative)
                            </li>
                            <br/>
                            <li><strong>Customer Service and Relations:</strong> Developed strong interpersonal skills
                                through different roles including food service at Red Rooster and Off the Planet
                                Burgers, as well as coaching at sailing summer camps.
                            </li>
                            <br/>
                            <li><strong>Problem Solving:</strong> Sharpened through solo developing technical projects
                                such as
                                Vangbot, and contributing to complex robotics systems in competitions and the RMIT
                                Battle Bots
                                Team.
                            </li>
                            <br/>
                            <li><strong>Critical Thinking:</strong> Honed through academic and professional experiences
                                such as my studies at RMIT, where a vast majority of projects involve analyzing complex
                                problems. Also obtained through my certification in Design Thinking from Purdue
                                University.
                            </li>
                            <br/>
                            <li><strong>Communication:</strong> Strengthened through both leading and being a part of teams in diverse
                                environments, from being on inter-club planning committees to being a community manager at VidLabs.
                            </li>
                            <br/>
                        </ul>
                    </section>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="Hard Skills"/>
                        <div className="grid grid-cols-2 auto-rows-auto gap-20 mx-auto">
                            <div>
                                <SkillIcon src="htmlcss.png" alt="HTML/CSS" name="HTML/CSS"/>
                            </div>
                            <div>
                                <SkillIcon src="react.png" alt="React" name="React"/>
                            </div>
                            <div>
                                <SkillIcon src="node.png" alt="Node.js" name="Node.js"/>
                            </div>
                            <div>
                                <SkillIcon src="ts.png" alt="TypeScript.js" name="TypeScript"/>
                            </div>
                            <div>
                                <SkillIcon src="java.png" alt="Java" name="Java"/>
                            </div>
                            <div>
                                <SkillIcon src="cpp.png" alt="C++" name="C++"/>
                            </div>
                            <div>
                                <SkillIcon src="js.png" alt="JavaScript" name="JavaScript"/>
                            </div>
                            <div>
                                <SkillIcon src="python.png" alt="Python" name="Python"/>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <Image src="3.jpg" alt="Temporary Image" height="50" width="50"
                           className="h-full w-auto mx-auto object-cover rounded-lg shadow-md"></Image>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="What I&apos;m Currently Up To"/>
                        <ul className="list-disc pl-5 text-lg">
                            <li><strong>PortStart.ai:</strong> Developing an AI-powered umpire system for sailing.</li>
                            <br/>
                            <li><strong>RMIT BattleBots Website:</strong> Creating a website for the RMIT BattleBots
                                team.
                            </li>
                            <br/>
                            <li><strong>Open Source:</strong> Exploring IoT projects (Raspberry Pis, Flipper Zero, etc)
                                and other community developments.
                            </li>
                            <br/>
                            <li><strong>Custom 3d printed items:</strong> Creating solutions for random issues people
                                have, such as winch covers or whiteboard boats for sailing
                            </li>
                            <br/>
                            <li><strong>HEX Ambassador:</strong> Brand ambassador for HEX International, strengthening
                                outreach and advocacy skills by promoting the brand and engaging with diverse audiences
                            </li>
                            <br/>
                            <li><strong>More coming soon 👀</strong></li>
                        </ul>
                    </section>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <section className="mb-10">
                        <SectionHeader title="Contact"/>
                        <ul className="list-disc pl-5">
                            <li><strong>GitHub:</strong> <a href="https://github.com/lbrh"
                                                            className="text-blue-600 hover:underline">Liam Robinson
                                Hounsell (lbrh)</a>
                            </li>
                            <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/lbrh"
                                                              className="text-blue-600 hover:underline">Liam
                                Robinson Hounsell</a></li>
                            <li><strong>Email:</strong> <a href="mailto:lbrhounsell@gmail.com"
                                                           className="text-blue-600 hover:underline">lbrhounsell@gmail.com</a>
                            </li>
                        </ul>
                        <p>Let&apos;s connect, collaborate, or chat about technology, sailing, or anything in
                            between!</p>
                    </section>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <Image src="4.JPG" alt="Temporary Image" height="50" width="50"
                           className="h-full w-auto mx-auto object-cover rounded-lg shadow-md"></Image>
                </div>
            </div>
            <footer className="bg-[#516a6f] text-white text-center py-2.5">
                <p>Hope you enjoyed my website!</p>
            </footer>
        </div>
    );
}
