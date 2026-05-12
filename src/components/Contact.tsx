import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function Contact() {
  return (
    <Card className="border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
      <SectionHeader title="Contact" />
      <ul className="list-disc space-y-3 pl-5 text-sm md:text-lg">
        <li>
          <strong>Phone:</strong>{" "}
          <a href="tel:+61498050631" className="text-cyan-800 underline underline-offset-2 hover:text-cyan-950">
            0498 050 631
          </a>
        </li>
        <li>
          <strong>GitHub:</strong>{" "}
          <a
            href="https://github.com/lbrh"
            className="text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
          >
            github.com/lbrh
          </a>
        </li>
        <li>
          <strong>LinkedIn:</strong>{" "}
          <a
            href="https://www.linkedin.com/in/lbrh"
            className="text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
          >
            linkedin.com/in/lbrh
          </a>
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:lbrhounsell@gmail.com"
            className="text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
          >
            lbrhounsell@gmail.com
          </a>
        </li>
        <li>
          <strong>Resume (PDF):</strong>{" "}
          <a
            href="/Liam_Robinson_Hounsell_Resume.pdf"
            className="text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
          >
            Download latest CV
          </a>
        </li>
      </ul>
      <p className="mt-6 text-sm text-slate-600 md:text-base">
        Open to teaming up on humane, high-impact software: sailing tech,
        realtime data, civic tools, creative web, you name it.
      </p>
    </Card>
  );
}
