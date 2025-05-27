interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h2 className="text-3xl mb-5 text-blue-600 border-b-2 border-blue-600 pb-1">{title}</h2>
  );
} 