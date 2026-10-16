"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormResult } from "@/lib/form-result";
import CloudinaryUploadButton from "./CloudinaryUploadButton";
import SubmitButton from "./SubmitButton";

type LessonFormProps = {
  action: (formData: FormData) => Promise<FormResult>;
  submitLabel: string;
  initial?: { title: string; textContent: string; videoUrl: string };
  resetOnSuccess?: boolean;
  onSavedHref?: string;
};

export default function LessonForm({
  action,
  submitLabel,
  initial,
  resetOnSuccess = false,
  onSavedHref,
}: LessonFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [textContent, setTextContent] = useState(initial?.textContent ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  async function handleAction(formData: FormData) {
    setMessage(null);

    const result = await action(formData);

    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }

    if (onSavedHref) {
      router.push(onSavedHref);
      return;
    }

    setMessage({ kind: "success", text: "Lesson saved." });

    if (resetOnSuccess) {
      setTitle("");
      setTextContent("");
      setVideoUrl("");
    }
  }

  return (
    <form action={handleAction} className="space-y-5">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "border-l-4 border-madder bg-madder/10 px-3 py-2 text-sm"
              : "border-l-4 border-fern bg-fern/10 px-3 py-2 text-sm"
          }
        >
          {message.text}
        </p>
      )}

      <div>
        <label
          htmlFor="lesson-title"
          className="mb-1.5 block text-sm font-bold"
        >
          Lesson title
        </label>
        <input
          id="lesson-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={150}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="lesson-text" className="mb-1.5 block text-sm font-bold">
          Lesson text <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="lesson-text"
          name="textContent"
          rows={6}
          value={textContent}
          onChange={(event) => setTextContent(event.target.value)}
          maxLength={20000}
          className="field"
        />
        <p className="mt-1.5 text-sm text-muted">
          Line breaks are kept. Students read this above the video.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">
          Video <span className="font-normal text-muted">(optional)</span>
        </p>
        <div className="mb-3 flex flex-wrap items-start gap-3">
          <CloudinaryUploadButton onUploadComplete={setVideoUrl} />
          <span className="pt-1.5 text-sm text-muted">
            or paste a YouTube link:
          </span>
        </div>
        <label htmlFor="lesson-video" className="sr-only">
          Video link
        </label>
        <input
          id="lesson-video"
          name="videoUrl"
          inputMode="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="field"
        />
        <p className="mt-1.5 text-sm text-muted">
          Students must watch the whole video to complete the lesson, so shorter
          videos work best.
        </p>
      </div>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
