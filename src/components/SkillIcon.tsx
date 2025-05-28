import Image from "next/image";

interface SkillIconProps {
  src: string;
  alt: string;
  name: string;
}

export default function SkillIcon({ src, alt, name }: SkillIconProps) {
  return (
    <div className="text-center">
      <div className="h-20 w-20 mx-auto mb-2.5 relative">
        <Image src={src} alt={alt} fill className="object-contain" />
      </div>
      <span className="block text-base">{name}</span>
    </div>
  );
}
