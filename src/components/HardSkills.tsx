import SectionHeader from "./SectionHeader";
import SkillIcon from "./SkillIcon";
import Card from "./Card";

export default function HardSkills() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Technical skills (details)" />

      <p className="mb-8 text-sm text-slate-600 md:text-base">
        Pulled straight from my resume: languages, stacks, infra, and data
        layers I reach for regularly.
      </p>

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <SkillIcon src="react.png" alt="React" name="React / Next.js" />
        <SkillIcon src="ts.png" alt="TypeScript" name="TypeScript" />
        <SkillIcon src="node.png" alt="Node.js" name="Node.js" />
        <SkillIcon src="js.png" alt="JavaScript" name="JavaScript" />
        <SkillIcon src="java.png" alt="Java" name="Java" />
        <SkillIcon src="cpp.png" alt="C++" name="C++" />
        <SkillIcon src="python.png" alt="Python" name="Python" />
        <SkillIcon src="htmlcss.png" alt="HTML/CSS" name="HTML / CSS" />
      </div>

      <dl className="grid gap-6 text-sm md:grid-cols-2 md:text-base">
        <div>
          <dt className="font-semibold text-cyan-900">Languages</dt>
          <dd className="mt-1 text-slate-700">
            TypeScript, JavaScript, C++, Java (plus coursework and tooling across
            the stack).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-cyan-900">Frameworks</dt>
          <dd className="mt-1 text-slate-700">
            Next.js, React, Node.js, Express, Spring Boot.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-cyan-900">Cloud &amp; deployment</dt>
          <dd className="mt-1 text-slate-700">
            AWS, Google Firebase, Vercel, Supabase.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-cyan-900">Tools</dt>
          <dd className="mt-1 text-slate-700">
            Git, GitHub Actions, Docker, WordPress.
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-semibold text-cyan-900">Databases</dt>
          <dd className="mt-1 text-slate-700">MySQL, SQLite, PostgreSQL.</dd>
        </div>
      </dl>
    </Card>
  );
}
