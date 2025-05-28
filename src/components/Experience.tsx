import ExperienceCard from "./ExperienceCard";
import Card from "./Card";
import SectionHeader from "@/components/SectionHeader";

export default function Experience() {
  return (
    <Card>
      <SectionHeader title="Past Experiences" />
      <ExperienceCard
        title="Consulate General of Canada "
        period="Data Analyst and Back End Developer | 2023-2024"
        description="- Created and updated 1000+ pages for the Canadian Flavors website. <br />
                - Populated said pages with data pulled from multiple sources including company databases and spreadsheets."
        websiteUrl="https://www.canadianflavors.com/"
      />
      <ExperienceCard
        title="Amazon Prime Air"
        period="Internship | 2023"
        description="
                - Gained insight into software development for drone operations, including backend systems and flight algorithm testing processes in real-world environments. <br />
                - Learned how teams analyze customer needs and preferences to shape drone delivery solutions, emphasizing user-centric design and convenience. <br />
                - Explored both software and physical development cycles through rotations across diverse teams."
      />
      <ExperienceCard
        title="Community Sailing School"
        period="Website Developer | 2022-2023"
        description="- Designed and maintained a WordPress site for 350+ sailors, coaches, and supporters.<br />
                - Website design brief created by utilizing design thinking to ensure work was appropriately scoped and customer needs were well understood."
        websiteUrl="https://www.communitysailingschool.org"
      />
      <ExperienceCard
        title="VangBot"
        period="Node.js Developer | 2019-2023"
        description="- Developed a Discord bot using Node.js and Discord.js, hosted on a Raspberry Pi for 24/7 uptime. <br />
                - Integrated a SQL database for persistent user data and server configurations. <br />
                - Served over 10,000 users across multiple Discord servers with advanced moderation and utility features."
      />
    </Card>
  );
}
