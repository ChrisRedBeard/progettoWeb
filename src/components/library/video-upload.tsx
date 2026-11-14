"use client";

import { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "@/components/training/video-player";
import { declaredVideoMime, videoDurationMessage, videoSizeMessage } from "@/lib/storage/media";

export function VideoUpload({
  label,
  existingId,
  onUploaded,
  onBusy,
}: {
  label: string;
  existingId: string | null;
  onUploaded: (uploadId: string | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      xhrRef.current?.abort();
    };
  }, [preview]);

  function remember(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setDone(false);
    onUploaded(null);
  }

  async function start(file: File) {
    setError(null);
    const mime = declaredVideoMime(file);
    if (!mime) {
      setError("Usa un file MP4 o WebM.");
      return;
    }
    const sizeError = videoSizeMessage(file.size);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    onBusy(true);
    setProgress(0);
    try {
      const seconds = await readDuration(file);
      const durationError = videoDurationMessage(seconds);
      if (durationError) {
        setError(durationError);
        setProgress(null);
        onBusy(false);
        return;
      }
      const opened = await fetch("/api/videos/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType: mime, sizeBytes: file.size }),
      });
      const ticket = (await opened.json()) as { uploadUrl?: string; uploadId?: string; error?: string };
      if (!opened.ok || !ticket.uploadUrl || !ticket.uploadId) {
        setError(ticket.error ?? "Caricamento non riuscito.");
        setProgress(null);
        onBusy(false);
        return;
      }
      await putFile(ticket.uploadUrl, file, mime);
      onUploaded(ticket.uploadId);
      setDone(true);
      setProgress(null);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      if (message === "annullato") setError("Caricamento annullato.");
      else if (message === "unread") setError(videoDurationMessage(Number.NaN) ?? "Video non leggibile.");
      else if (message && message !== "rete") setError(message);
      else setError("Caricamento non riuscito. Riprova.");
      setProgress(null);
    } finally {
      onBusy(false);
    }
  }

  function putFile(url: string, file: File, mime: string) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("PUT", url);
      xhr.setRequestHeader("content-type", mime);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          const message = readError(xhr.responseText);
          setError(message);
          reject(new Error(message));
        }
      };
      xhr.onerror = () => reject(new Error("rete"));
      xhr.onabort = () => reject(new Error("annullato"));
      xhr.send(file);
    });
  }

  return (
    <fieldset className="rounded-2xl border border-line bg-panel p-4">
      <legend className="px-1 text-lg font-extrabold">{label}</legend>
      <p className="mt-1 text-base text-muted">Verticale o orizzontale. MP4 o WebM, massimo 100 MB e 3 minuti.</p>
      {preview ? (
        <video src={preview} controls playsInline className="mt-3 aspect-video w-full rounded-2xl bg-black" />
      ) : (
        <div className="mt-3">
          <VideoPlayer title={label} videoId={existingId} />
        </div>
      )}
      {done ? <p className="mt-3 text-base font-bold">Video caricato.</p> : null}
      {progress !== null ? (
        <div className="mt-3">
          <div className="h-3 overflow-hidden rounded-full bg-black/10" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-base font-bold" aria-live="polite">
            Caricamento {progress}%
          </p>
          <button
            type="button"
            className="mt-2 min-h-12 text-base font-bold text-muted"
            onClick={() => xhrRef.current?.abort()}
          >
            Annulla
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 text-base font-bold" role="alert">
          {error}
        </p>
      ) : null}
      <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-line px-4 text-lg font-extrabold">
        {done || existingId ? "Sostituisci video" : "Scegli video"}
        <input
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            remember(file);
            void start(file);
          }}
        />
      </label>
      {error && fileRef.current ? (
        <button type="button" className="mt-2 min-h-12 w-full text-base font-bold" onClick={() => fileRef.current && void start(fileRef.current)}>
          Riprova
        </button>
      ) : null}
    </fieldset>
  );
}

function readDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unread"));
    };
    video.src = url;
  });
}

function readError(raw: string) {
  try {
    const body = JSON.parse(raw) as { error?: string };
    return body.error ?? "Caricamento non riuscito.";
  } catch {
    return "Caricamento non riuscito.";
  }
}
