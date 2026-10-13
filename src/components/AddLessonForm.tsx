"use client";

import { useState, useRef } from "react";
import CloudinaryUploadButton from "./CloudinaryUploadButton";

export default function AddLessonForm({
  addLessonAction,
}: {
  addLessonAction: (formData: FormData) => Promise<void>;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addLessonAction(formData);
        formRef.current?.reset();
        setVideoUrl("");
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Lesson Title</label>
        <input
          type="text"
          name="title"
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Text Content (optional)
        </label>
        <textarea
          name="textContent"
          rows={3}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Video (optional)
        </label>

        <div className="flex items-center gap-3 mb-2">
          <CloudinaryUploadButton onUploadComplete={setVideoUrl} />
          <span className="text-sm text-gray-500">
            or paste a YouTube link below
          </span>
        </div>

        <input
          type="text"
          name="videoUrl"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/... (filled automatically after upload)"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
      >
        Add Lesson
      </button>
    </form>
  );
}
