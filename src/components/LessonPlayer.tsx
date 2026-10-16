"use client";

import { useEffect, useRef, useState } from "react";
import { startWatching, finishWatching } from "@/app/courses/actions";
import { getYouTubeVideoId } from "@/lib/video";
import LessonVideo from "./LessonVideo";
import ProgressBar from "./ProgressBar";

const SKIP_TOLERANCE = 2.5;
const END_MARGIN = 2;
const MAX_RATE = 2;

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number>;
      events?: { onStateChange?: (event: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApi: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youTubeApi) {
    youTubeApi = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT as YTNamespace);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }

  return youTubeApi;
}

function useWatchTracker({
  courseId,
  lessonId,
  tracking,
}: {
  courseId: string;
  lessonId: string;
  tracking: boolean;
}) {
  const maxRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const [percent, setPercent] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  async function onPlay() {
    lastTickRef.current = null;

    if (!tracking || startedRef.current) return;
    startedRef.current = true;

    const result = await startWatching(courseId, lessonId);

    if (!result.ok) {
      startedRef.current = false;
      setNotice(result.message);
    }
  }

  function onTick(current: number, duration: number): number | null {
    if (!tracking || finishedRef.current) return null;

    const now = performance.now();
    const elapsed =
      lastTickRef.current === null ? 0 : (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    const allowed = maxRef.current + elapsed * MAX_RATE + SKIP_TOLERANCE;

    if (current > allowed) {
      setNotice(
        "Skipping ahead is turned off. You can go back, but you need to watch the video to the end.",
      );
      return maxRef.current;
    }

    if (current > maxRef.current) {
      maxRef.current = current;

      if (Number.isFinite(duration) && duration > 0) {
        setPercent(
          Math.min(100, Math.floor((maxRef.current / duration) * 100)),
        );
      }
    }

    return null;
  }

  async function onEnded(duration: number) {
    if (!tracking || finishedRef.current) return;

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      maxRef.current < duration - END_MARGIN
    ) {
      setNotice(
        "The video ended before you watched all of it. Watch from the beginning to complete the lesson.",
      );
      return;
    }

    finishedRef.current = true;
    setNotice("Saving your progress...");

    const result = await finishWatching(courseId, lessonId, duration);

    if (result.ok) {
      setPercent(100);
      setNotice(null);
    } else {
      finishedRef.current = false;
      setNotice(result.message);
    }
  }

  return { percent, notice, onPlay, onTick, onEnded };
}

type LessonPlayerProps = {
  courseId: string;
  lessonId: string;
  url: string;
  title: string;
  tracking: boolean;
};

export default function LessonPlayer({
  courseId,
  lessonId,
  url,
  title,
  tracking,
}: LessonPlayerProps) {
  const [tracked, setTracked] = useState(tracking);

  if (tracking && !tracked) {
    setTracked(true);
  }

  const videoId = getYouTubeVideoId(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const tracker = useWatchTracker({ courseId, lessonId, tracking });
  const trackerRef = useRef(tracker);

  useEffect(() => {
    trackerRef.current = tracker;
  });

  useEffect(() => {
    if (!tracked || !videoId || !containerRef.current) return;

    let cancelled = false;
    let interval: number | undefined;
    let player: YTPlayer | undefined;

    const target = document.createElement("div");
    containerRef.current.appendChild(target);

    loadYouTubeApi().then((yt) => {
      if (cancelled) return;

      player = new yt.Player(target, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onStateChange: (event) => {
            window.clearInterval(interval);

            if (event.data === yt.PlayerState.PLAYING) {
              trackerRef.current.onPlay();

              interval = window.setInterval(() => {
                if (!player) return;

                const back = trackerRef.current.onTick(
                  player.getCurrentTime(),
                  player.getDuration(),
                );

                if (back !== null) {
                  player.seekTo(back, true);
                }

                if (player.getPlaybackRate() > MAX_RATE) {
                  player.setPlaybackRate(MAX_RATE);
                }
              }, 500);
            } else if (event.data === yt.PlayerState.ENDED && player) {
              trackerRef.current.onEnded(player.getDuration());
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      player?.destroy();
      target.remove();
    };
  }, [tracked, videoId]);

  if (!tracked) {
    return <LessonVideo url={url} title={title} />;
  }

  return (
    <div className="mt-5">
      <div className="aspect-video w-full overflow-hidden rounded-sm bg-ink">
        {videoId ? (
          <div
            ref={containerRef}
            className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full"
          />
        ) : (
          <video
            src={url}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
            onPlay={tracker.onPlay}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              const back = tracker.onTick(video.currentTime, video.duration);
              if (back !== null) video.currentTime = back;
            }}
            onSeeking={(e) => {
              const video = e.currentTarget;
              const back = tracker.onTick(video.currentTime, video.duration);
              if (back !== null) video.currentTime = back;
            }}
            onEnded={(e) => tracker.onEnded(e.currentTarget.duration)}
            onRateChange={(e) => {
              if (e.currentTarget.playbackRate > MAX_RATE) {
                e.currentTarget.playbackRate = MAX_RATE;
              }
            }}
          />
        )}
      </div>

      {tracking && (
        <div className="mt-3">
          <ProgressBar
            value={tracker.percent}
            max={100}
            label={`Watched so far: ${title}`}
          />
          <p className="mt-2 text-sm text-muted">
            Watched {tracker.percent}%. Skipping ahead is turned off. Watch to
            the end to complete this lesson.
          </p>
        </div>
      )}

      {tracker.notice && (
        <p
          aria-live="polite"
          className="mt-3 border-l-4 border-saffron bg-saffron/15 px-3 py-2 text-sm"
        >
          {tracker.notice}
        </p>
      )}
    </div>
  );
}
