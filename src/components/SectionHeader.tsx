interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h2 className="mb-5 border-b-2 border-cyan-600 pb-2 text-3xl font-semibold tracking-tight text-cyan-900">
      {title}
    </h2>
  );
}
