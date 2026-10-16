"use client";

import { useState } from "react";

type CloudinaryResult = {
  event: string;
  info: { secure_url?: string };
};

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (
          error: unknown,
          result: CloudinaryResult | undefined,
        ) => void,
      ) => { open: () => void };
    };
  }
}

export default function CloudinaryUploadButton({
  onUploadComplete,
}: {
  onUploadComplete: (url: string) => void;
}) {
  const [uploaded, setUploaded] = useState(false);

  const openWidget = () => {
    if (!window.cloudinary) {
      alert("The upload tool is still loading. Please try again in a moment.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ["local"],
        resourceType: "video",
        multiple: false,
      },
      (error, result) => {
        if (!error && result?.event === "success" && result.info.secure_url) {
          setUploaded(true);
          onUploadComplete(result.info.secure_url);
        }
      },
    );

    widget.open();
  };

  return (
    <div>
      <button
        type="button"
        onClick={openWidget}
        className="btn btn-ghost btn-sm"
      >
        Upload a video file
      </button>
      {uploaded && (
        <p role="status" className="mt-2 text-sm font-bold text-fern">
          Video uploaded. The link is filled in below.
        </p>
      )}
    </div>
  );
}
