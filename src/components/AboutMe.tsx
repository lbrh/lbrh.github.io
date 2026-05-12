import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function AboutMe() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Professional summary" />
      <div className="space-y-4 text-sm leading-relaxed text-slate-800 md:text-lg">
        <p>
          Software engineer with experience building full stack, cloud-backed
          applications using modern frameworks including Next.js, Spring Boot,
          Express.js, and SQL. I like taking messy problems, pairing closely
          with people who use the product, and shipping solutions that stay fast
          and dependable as usage grows.
        </p>
        <p className="text-slate-600">
          Raised across the USA, China, and Australia, I gravitate toward
          collaborative teams built around hackathons, club leadership, robotics, and plenty
          of time on the water. Outside the terminal: sailing, bouldering,
          reading, and the occasional coffee chat.
        </p>
      </div>
    </Card>
  );
}
