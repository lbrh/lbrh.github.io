import Image from 'next/image';

interface SkillIconProps {
  src: string;
  alt: string;
  name: string;
}

export default function SkillIcon({ src, alt, name }: SkillIconProps) {
  return (
    <div className="text-center">
      <Image src={src} alt={alt} width={64} height={64} className="mx-auto mb-2.5" />
      <span className="block text-base">{name}</span>
    </div>
  );
} 