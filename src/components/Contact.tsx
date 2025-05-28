import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function Contact() {
  return (
    <Card>
      <SectionHeader title="Contact" />
      <ul className="list-disc pl-5 text-sm md:text-lg">
        <li>
          <strong>GitHub:</strong>{" "}
          <a
            href="https://github.com/lbrh"
            className="text-blue-600 hover:underline"
          >
            Liam Robinson Hounsell (lbrh)
          </a>
        </li>
        <li>
          <strong>LinkedIn:</strong>{" "}
          <a
            href="https://www.linkedin.com/in/lbrh"
            className="text-blue-600 hover:underline"
          >
            Liam Robinson Hounsell
          </a>
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:lbrhounsell@gmail.com"
            className="text-blue-600 hover:underline"
          >
            lbrhounsell@gmail.com
          </a>
        </li>
      </ul>
      <p>
        Let&apos;s connect, collaborate, or chat about technology, sailing, or
        anything in between!
      </p>
    </Card>
  );
}
