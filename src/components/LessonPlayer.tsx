"use client";

import { useEffect, useRef, useState } from "react";
import { reportProgress, finishWatching } from "@/app/courses/actions";
import { getYouTubeVideoId } from "@/lib/video";
import { END_MARGIN, HEARTBEAT_SECONDS, MAX_RATE } from "@/lib/watch-rules";
import LessonVideo from "./LessonVideo";
import ProgressBar from "./ProgressBar";

const SKIP_TOLERANCE = 2.5;

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
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
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

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

type Reader = () => { current: number; duration: number } | null;

function useWatchTracker({
  courseId,
  lessonId,
  tracking,
  savedSeconds,
  savedDuration,
}: {
  courseId: string;
  lessonId: string;
  tracking: boolean;
  savedSeconds: number;
  savedDuration: number | null;
}) {
  const frontierRef = useRef(savedSeconds);
  const lastTickRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const readerRef = useRef<Reader | null>(null);
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(
    savedDuration && savedDuration > 0
      ? Math.min(100, Math.floor((savedSeconds / savedDuration) * 100))
      : 0,
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    if (!tracking || finishedRef.current) return;

    const read = readerRef.current?.();
    if (!read || !Number.isFinite(read.duration) || read.duration <= 0) return;

    const result = await reportProgress(
      courseId,
      lessonId,
      read.current,
      read.duration,
    );

    if (!result.ok) {
      setNotice(result.message);
    }
  }

  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!playing || !tracking) return;

    const id = window.setInterval(() => {
      void saveRef.current();
    }, HEARTBEAT_SECONDS * 1000);

    return () => window.clearInterval(id);
  }, [playing, tracking]);

  useEffect(() => {
    if (!tracking) return;

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        void saveRef.current();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [tracking]);

  function setReader(reader: Reader | null) {
    readerRef.current = reader;
  }

  function onPlay() {
    lastTickRef.current = null;
    setNotice(null);
    setPlaying(true);
    void save();
  }

  function onPause() {
    setPlaying(false);
    void save();
  }

  function onTick(current: number, duration: number): number | null {
    if (!tracking || finishedRef.current) return null;

    const now = performance.now();
    const elapsed =
      lastTickRef.current === null ? 0 : (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    const allowed = frontierRef.current + elapsed * MAX_RATE + SKIP_TOLERANCE;

    if (current > allowed) {
      setNotice(
        "Skipping ahead is turned off. You can go back and rewatch, but you need to watch the video to the end.",
      );
      return frontierRef.current;
    }

    if (current > frontierRef.current) {
      frontierRef.current = current;

      if (Number.isFinite(duration) && duration > 0) {
        setPercent(Math.min(100, Math.floor((current / duration) * 100)));
      }
    }

    return null;
  }

  async function onEnded(duration: number) {
    setPlaying(false);

    if (!tracking || finishedRef.current) return;

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      frontierRef.current < duration - END_MARGIN
    ) {
      setNotice(
        "The video ended before you watched all of it. Play it again to the end to complete the lesson.",
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

  return { percent, notice, setReader, onPlay, onPause, onTick, onEnded };
}

type LessonPlayerProps = {
  courseId: string;
  lessonId: string;
  url: string;
  title: string;
  tracking: boolean;
  savedSeconds: number;
  savedDuration: number | null;
};

type StartPoint = { at: number; auto: boolean };

export default function LessonPlayer({
  courseId,
  lessonId,
  url,
  title,
  tracking,
  savedSeconds,
  savedDuration,
}: LessonPlayerProps) {
  const [tracked, setTracked] = useState(tracking);

  if (tracking && !tracked) {
    setTracked(true);
  }

  const hasResumePoint =
    tracking &&
    savedSeconds >= 5 &&
    (savedDuration === null || savedSeconds < savedDuration - END_MARGIN);

  const [start, setStart] = useState<StartPoint | null>(
    hasResumePoint ? null : { at: 0, auto: false },
  );

  const videoId = getYouTubeVideoId(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracker = useWatchTracker({
    courseId,
    lessonId,
    tracking,
    savedSeconds,
    savedDuration,
  });
  const trackerRef = useRef(tracker);

  useEffect(() => {
    trackerRef.current = tracker;
  });

  useEffect(() => {
    if (!tracked || !videoId || !start || !containerRef.current) return;

    let cancelled = false;
    let poll: number | undefined;
    let player: YTPlayer | undefined;

    const target = document.createElement("div");
    containerRef.current.appendChild(target);

    loadYouTubeApi().then((yt) => {
      if (cancelled) return;

      player = new yt.Player(target, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          playsinline: 1,
          start: Math.floor(start.at),
          autoplay: start.auto ? 1 : 0,
        },
        events: {
          onStateChange: (event) => {
            window.clearInterval(poll);

            if (event.data === yt.PlayerState.PLAYING) {
              trackerRef.current.onPlay();

              poll = window.setInterval(() => {
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
            } else if (event.data === yt.PlayerState.PAUSED) {
              trackerRef.current.onPause();
            } else if (event.data === yt.PlayerState.ENDED && player) {
              trackerRef.current.onEnded(player.getDuration());
            }
          },
        },
      });

      trackerRef.current.setReader(() =>
        player
          ? { current: player.getCurrentTime(), duration: player.getDuration() }
          : null,
      );
    });

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      trackerRef.current.setReader(null);
      player?.destroy();
      target.remove();
    };
  }, [tracked, videoId, start]);

  useEffect(() => {
    if (!tracked || videoId || !start) return;

    trackerRef.current.setReader(() => {
      const video = videoRef.current;
      return video
        ? { current: video.currentTime, duration: video.duration }
        : null;
    });

    return () => trackerRef.current.setReader(null);
  }, [tracked, videoId, start]);

  if (!tracked) {
    return <LessonVideo url={url} title={title} />;
  }

  if (start === null) {
    return (
      <div className="mt-5 border border-rule bg-paper p-5">
        <p className="font-bold">
          {savedDuration
            ? `You watched ${formatTime(savedSeconds)} of ${formatTime(savedDuration)} last time.`
            : `You watched up to ${formatTime(savedSeconds)} last time.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setStart({ at: savedSeconds, auto: true })}
          >
            Resume from {formatTime(savedSeconds)}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStart({ at: 0, auto: true })}
          >
            Start from the beginning
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Your place is saved automatically. If you start from the beginning,
          you keep everything you have already watched.
        </p>
      </div>
    );
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
            ref={videoRef}
            src={url}
            controls
            preload="metadata"
            autoPlay={start.auto}
            className="h-full w-full object-contain"
            onLoadedMetadata={(e) => {
              if (start.at > 0) {
                e.currentTarget.currentTime = start.at;
              }
            }}
            onPlay={tracker.onPlay}
            onPause={tracker.onPause}
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
            Watched {tracker.percent}%. Your place is saved automatically.
            Skipping ahead is turned off. Watch to the end to complete this
            lesson.
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
