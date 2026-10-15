import { getYouTubeEmbedUrl } from "@/lib/video";

export default function LessonVideo({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div className="mt-5 aspect-video w-full overflow-hidden rounded-sm bg-ink">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={`Video: ${title}`}
          loading="lazy"
          allowFullScreen
          className="h-full w-full"
        />
      ) : (
        <video
          src={url}
          controls
          preload="metadata"
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
