interface ExperienceCardProps {
  title: string;
  period: string;
  description: string;
  websiteUrl?: string;
  websiteLabel?: string;
}

export default function ExperienceCard({
  title,
  period,
  description,
  websiteUrl,
  websiteLabel,
}: ExperienceCardProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-md transition-all duration-300 last:mb-0 hover:border-cyan-400/35 hover:shadow-lg">
      <h3 className="mt-0 text-lg font-semibold text-cyan-900 md:text-xl">{title}</h3>
      <p className="text-sm font-medium text-slate-600">{period}</p>
      <p
        className="mt-3 text-sm leading-relaxed text-slate-800 md:text-base"
        dangerouslySetInnerHTML={{ __html: description }}
      />
      {websiteUrl && (
        <a
          href={websiteUrl}
          className="mt-4 inline-flex text-sm font-medium text-cyan-800 underline decoration-cyan-500/35 underline-offset-4 hover:text-cyan-950"
          rel="noreferrer noopener"
          target="_blank"
        >
          {websiteLabel ?? "Visit the site →"}
        </a>
      )}
    </div>
  );
}
