import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function SoftSkills() {
  return (
    <Card>
      <SectionHeader title="Soft Skills" />
      <ul className="list-disc pl-5 text-sm md:text-lg">
        <li>
          <strong>Leadership:</strong> Gained through years of experience of
          starting/leading teams of all sizes, from my highschool&apos;s esports
          or robotics team with a handful of people, all the way up to the
          entire year levels through class board
        </li>
        <br />
        <li>
          <strong>Team Work and Collaboration:</strong> Also gained through
          collaborative clubs/sports such as sailing, snowboarding, and GYLI
          (global youth leadership initiative)
        </li>
        <br />
        <li>
          <strong>Customer Service and Relations:</strong> Developed strong
          interpersonal skills through different roles including food service at
          Red Rooster and Off the Planet Burgers, as well as coaching at sailing
          summer camps.
        </li>
        <br />
        <li>
          <strong>Problem Solving:</strong> Sharpened through solo developing
          technical projects such as Vangbot, and contributing to complex
          robotics systems in competitions and the RMIT Battle Bots Team.
        </li>
        <br />
        <li>
          <strong>Critical Thinking:</strong> Honed through academic and
          professional experiences such as my studies at RMIT, where a vast
          majority of projects involve analyzing complex problems. Also obtained
          through my certification in Design Thinking from Purdue University.
        </li>
        <br />
        <li>
          <strong>Communication:</strong> Strengthened through both leading and
          being a part of teams in diverse environments, from being on
          inter-club planning committees to being a community manager at
          VidLabs.
        </li>
        <br />
      </ul>
    </Card>
  );
}
