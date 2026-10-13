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
      alert("Upload widget is still loading, please try again in a moment.");
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
        className="bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
      >
        Upload Video
      </button>
      {uploaded && (
        <p className="text-sm text-green-700 mt-2">
          ✅ Video uploaded successfully
        </p>
      )}
    </div>
  );
}
