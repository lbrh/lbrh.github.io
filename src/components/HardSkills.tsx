import SectionHeader from "./SectionHeader";
import SkillIcon from "./SkillIcon";
import Card from "./Card";

export default function HardSkills() {
  return (
    <Card>
      <SectionHeader title="Hard Skills" />
      <div className="grid h-full pb-5 grid-cols-2 content-stretch">
        <div>
          <SkillIcon src="htmlcss.png" alt="HTML/CSS" name="HTML/CSS" />
        </div>
        <div>
          <SkillIcon src="react.png" alt="React" name="React" />
        </div>
        <div>
          <SkillIcon src="node.png" alt="Node.js" name="Node.js" />
        </div>
        <div>
          <SkillIcon src="ts.png" alt="TypeScript.js" name="TypeScript" />
        </div>
        <div>
          <SkillIcon src="java.png" alt="Java" name="Java" />
        </div>
        <div>
          <SkillIcon src="cpp.png" alt="C++" name="C++" />
        </div>
        <div>
          <SkillIcon src="js.png" alt="JavaScript" name="JavaScript" />
        </div>
        <div>
          <SkillIcon src="python.png" alt="Python" name="Python" />
        </div>
      </div>
    </Card>
  );
}
