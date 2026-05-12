import Card from "./Card";
import SectionHeader from "./SectionHeader";

export default function Education() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Education" />
      <div className="space-y-6 text-sm md:text-base">
        <div>
          <h3 className="text-lg font-semibold text-cyan-800 md:text-xl">
            Royal Melbourne Institute of Technology (RMIT)
          </h3>
          <p className="text-slate-600">Melbourne, VIC · 2023 to 2027</p>
          <p className="mt-1 text-slate-800">
            Bachelor of Software Engineering (Professional), minor in Cyber Assurance
          </p>
        </div>
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-cyan-800 md:text-xl">
            Purdue University
          </h3>
          <p className="text-slate-600">West Lafayette, IN</p>
          <p className="mt-1 text-slate-800">Certificate in Design Thinking · 2022</p>
        </div>
      </div>
    </Card>
  );
}
