"use client";

import { useEffect, useState } from "react";

export function VideoPlayer({ title, videoId }: { title: string; videoId?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(!videoId);

  useEffect(() => {
    if (!videoId) {
      setMissing(true);
      setSrc(null);
      return;
    }
    let gone = false;
    setMissing(false);
    setSrc(null);
    fetch(`/api/videos/${videoId}/url`)
      .then(async (response) => {
        if (!response.ok) {
          if (!gone) setMissing(true);
          return;
        }
        const body = (await response.json()) as { url?: string };
        if (!gone) setSrc(body.url ?? null);
        if (!gone && !body.url) setMissing(true);
      })
      .catch(() => {
        if (!gone) setMissing(true);
      });
    return () => {
      gone = true;
    };
  }, [videoId]);

  if (!videoId || missing) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-line bg-panel px-4 text-center landscape:aspect-auto landscape:h-28">
        <p className="text-lg font-extrabold">{title}</p>
        <p className="mt-1 text-base text-muted">Video non disponibile</p>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-line bg-panel px-4">
        <p className="text-base font-bold text-muted">Caricamento video</p>
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full rounded-2xl bg-black landscape:aspect-auto landscape:h-28"
      aria-label={title}
    />
  );
}
