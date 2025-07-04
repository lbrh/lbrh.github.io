interface ExperienceCardProps {
  title: string;
  period: string;
  description: string;
  websiteUrl?: string;
}

export default function ExperienceCard({
  title,
  period,
  description,
  websiteUrl,
}: ExperienceCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <h3 className="text-xl text-blue-600 mt-0">
        {title} | {period}
      </h3>
      <p dangerouslySetInnerHTML={{ __html: description }} />
      {websiteUrl && (
        <a href={websiteUrl} className="hover:underline text-blue-500">
          Visit the site
        </a>
      )}
    </div>
  );
}
