import ExperienceCard from "./ExperienceCard";
import Card from "./Card";
import SectionHeader from "@/components/SectionHeader";

export default function Experience() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Professional experience" />
      <ExperienceCard
        title="Royal Yacht Club of Victoria"
        period="Assistant Sailing Manager · Part-time · Jan 2026 to present · Williamstown, VIC · On-site"
        description="
                - Supported event planning and delivery across regattas and club racing series.<br/>
                - Coordinated race-day logistics: course setup, documentation, and volunteer coverage.<br/>
                - Acted as a steady contact for members, sailors, and visiting competitors.<br/>
                - Helped uphold safety procedures and maritime compliance during on-water activity.<br/>
                - Maintained regatta equipment, boats, and club assets between events.<br/>
                - Used digital tooling and race-management workflows to track participation and performance data."
      />
      <ExperienceCard
        title="Telltale Solutions"
        period="Founder &amp; Lead Developer · Self-employed · Nov 2024 to present · Melbourne, VIC"
        description="
                - Founded Telltale Solutions to pair AI with competitive sailing decision support.<br/>
                - Designed an automated umpire roadmap focused on accuracy and fairness in racing.<br/>
                - Prototyped approaches that combine race telemetry with real-time judgements.<br/>
                - Owned the full build cycle from concept through implementation as a solo developer.<br/>
                - Worked to blend new tooling with traditionally manual race-officiating workflows."
        websiteUrl="https://telltalesolutions.com.au/"
        websiteLabel="Telltale Solutions homepage →"
      />
      <ExperienceCard
        title="HEX"
        period="Ambassador · Feb 2025 to present · West Melbourne, VIC"
        description="
                - Represented HEX at school and college fairs plus digital channels.<br/>
                - Built ties with faculty, clubs, and entrepreneurship communities to widen reach.<br/>
                - Ran campus activations spanning workshops, webinars, and networking formats.<br/>
                - Partnered with HEX marketing on campaigns aimed at student audiences."
      />
      <ExperienceCard
        title="Community Sailing School Foundation"
        period="Website Developer · Freelance · Oct 2022 to present · Detroit, MI · Hybrid"
        description="
                - Designed and shipped a WordPress experience for 350+ sailors, coaches, and supporters.<br/>
                - Ran Design Thinking sessions with instructors to shape a sailor-friendly IA and content model.<br/>
                - Rolled out ecommerce and LMS-style flows that stay maintainable for non-developer staff.<br/>
                - Keeps the site current with regular content, performance, and accessibility passes."
        websiteUrl="https://www.communitysailingschool.org"
      />
      <ExperienceCard
        title="Amazon Prime Air"
        period="Intern · Seattle, WA · 2023"
        description="
                - Studied distributed systems operated at drone-delivery scale, with emphasis on availability and graceful degradation.<br/>
                - Mapped how latency budgets and redundancy patterns keep customer promises intact when traffic spikes.<br/>
                - Rotations across disciplines highlighted how UX feedback loops influence hardware and software iterations."
      />
    </Card>
  );
}
