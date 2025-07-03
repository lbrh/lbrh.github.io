import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function AboutMe() {
  return (
    <Card>
      <SectionHeader title="About Me" />
      <p className="text-sm text-sm md:text-lg">
        I&apos;m currently pursuing a Bachelor of Software Engineering at the
        Royal Melbourne Institute of Technology (RMIT), expected to graduate in
        July 2027. From growing up across the USA, China, and Australia,
        I&apos;ve always had an appreciation of different cultures and
        perspectives. I thrive on learning cutting edge technologies, tackling
        complex challenges, and creating impactful projects. I also actively
        participate in hackathons, conferences, and webinars due to a love to
        keep up with new and emerging projects/ideas. Outside of everything
        digital, I enjoy sailing, bouldering, and reading. I&apos;m always up
        for a quick coffee chat on or offline so feel free to reach out!
      </p>
    </Card>
  );
}
