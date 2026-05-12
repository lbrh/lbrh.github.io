import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function SoftSkills() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Leadership &amp; teamwork" />
      <ul className="list-disc space-y-4 pl-5 text-sm md:text-lg">
        <li>
          <strong>Leadership:</strong> Founded and lead the RMIT Sailing Club,
          structuring programs so members stay engaged regardless of skill
          level.
        </li>
        <li>
          <strong>Collaboration:</strong> Comfortable in agile-ish teams spanning
          robotics builds, sailing committees, and hackathon sprints where the
          goal is clarity under time pressure.
        </li>
        <li>
          <strong>Customer-facing craft:</strong> Front-of-house, coaching, and
          on-water race support (including RYCV operations) that keep communication
          steady when expectations run high.
        </li>
        <li>
          <strong>Brand and outreach:</strong> HEX Ambassador work across fairs,
          webinars, and partnerships that connect students with entrepreneurship
          programmes.
        </li>
        <li>
          <strong>Human-centred process:</strong> Design Thinking certification
          (Purdue), including workshops, facilitation, and keeping users in the loop while
          still shipping pragmatically.
        </li>
      </ul>
    </Card>
  );
}
